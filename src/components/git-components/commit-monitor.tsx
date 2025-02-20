import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { BasicCommit } from '@/types';
import useAppStore from '@/store';
import { notificationSound } from '@/lib/notification-sound';
import useGitHistory from '@/hooks/useGithubHistory';

const BATCH_SIZE = 3;
const BATCH_DELAY = 300;
const MAX_COMMITS_TO_PROCESS = 60;
const COMMIT_CHECK_TIMEOUT = 8000;
const NOTIFIED_COMMITS_KEY = 'notifiedCommits';
const SOUND_THROTTLE_PERIOD = 2000; // 2 seconds throttle for sound

// Custom debounce implementation with TypeScript types
const createDebounce = <T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

const CommitMonitor: React.FC = () => {
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const abortController = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCheckedTimestamp = useRef<number>(0);
  const isFirstCheck = useRef<boolean>(true);
  const lastSoundPlayed = useRef<number>(0);

  const { setCommits } = useGitHistory();

  const {
    getPackagePath,
    monoRepoPath,
    notificationSettings
  } = useAppStore();

  const {
    monitoredFolders: selectedFolders,
    checkInterval,
    isEnabled,
    enableAllFolderNotifications,
    selectedSound
  } = notificationSettings;

  const getNotifiedCommits = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(NOTIFIED_COMMITS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addNotifiedCommit = useCallback((commitId: string) => {
    try {
      const notifiedCommits = getNotifiedCommits();
      if (!notifiedCommits.includes(commitId)) {
        const updatedList = [...notifiedCommits, commitId].slice(-1000); // Keep last 1000 commits
        localStorage.setItem(NOTIFIED_COMMITS_KEY, JSON.stringify(updatedList));
      }
    } catch (error) {
      console.error('Failed to save notified commit:', error);
    }
  }, [getNotifiedCommits]);

  const isCommitNotified = useCallback((commitId: string): boolean => {
    const notifiedCommits = getNotifiedCommits();
    return notifiedCommits.includes(commitId);
  }, [getNotifiedCommits]);

  const playNotificationSound = useCallback(async () => {
    const now = Date.now();
    if (now - lastSoundPlayed.current > SOUND_THROTTLE_PERIOD) {
      await notificationSound(selectedSound);
      lastSoundPlayed.current = now;
    }
  }, [selectedSound]);

  const processCommitBatch = useCallback(async (
    commits: BasicCommit[],
    signal: AbortSignal
  ) => {
    if (signal.aborted) return;

    const basePath = getPackagePath(monoRepoPath);
    const newCommits = commits.filter(commit => !isCommitNotified(commit.id));

    if (newCommits.length === 0) return;

    for (const commit of newCommits) {
      if (signal.aborted) break;

      for (const folder of selectedFolders) {
        if (signal.aborted) break;

        try {
          const folderPath = `${basePath}/${folder}`;
          const details = await invoke('get_new_commits_details', {
            repoPath: folderPath,
            commitId: commit.id,
          }) as { changes: any[]; files: { path: string }[] };

          if (enableAllFolderNotifications || 
              details.changes.some((file: { file: string }) => file.file.includes(folder))) {
            
            if (!isCommitNotified(commit.id)) {
              await playNotificationSound();
              await sendNotification({
                title: `New Commit in ${folder}`,
                body: `${commit.author}: ${commit.message}`,
              });
              addNotifiedCommit(commit.id);
              break;
            }
          }
        } catch (error) {
          console.warn(`Skipping commit ${commit.id} for folder ${folder}:`, error);
        }
      }
    }
  }, [
    getPackagePath,
    monoRepoPath,
    selectedFolders,
    enableAllFolderNotifications,
    isCommitNotified,
    playNotificationSound,
    addNotifiedCommit
  ]);

  const checkNewCommits = useCallback(async () => {
    const now = Date.now();

    if (!isFirstCheck.current && now - lastCheckedTimestamp.current < checkInterval * 500) {
      return;
    }

    if (!isEnabled || selectedFolders.length === 0 || (isChecking && !isFirstCheck.current)) {
      setIsInitializing(false);
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    const { signal } = abortController.current;

    setIsChecking(true);
    setError('');
    lastCheckedTimestamp.current = now;

    try {
      const permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          setIsChecking(false);
          setIsInitializing(false);
          return;
        }
      }

      const newCommitsPromise = invoke('get_new_commits', {
        path: monoRepoPath,
        remote: 'upstream',
        branch: 'master'
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Commit fetch timeout')), COMMIT_CHECK_TIMEOUT);
      });

      let newCommits = await Promise.race([
        newCommitsPromise,
        timeoutPromise
      ]) as BasicCommit[];

      if (signal.aborted) return;

      newCommits = newCommits
        .filter(commit => !isCommitNotified(commit.id))
        .slice(0, MAX_COMMITS_TO_PROCESS);

      if (newCommits.length === 0) {
        setIsChecking(false);
        setIsInitializing(false);
        isFirstCheck.current = false;
        return;
      }

      setCommits(prevCommits => {
        const uniqueNewCommits = newCommits.filter(
          newCommit => !prevCommits.some(existingCommit => existingCommit.id === newCommit.id)
        );
        return [...uniqueNewCommits, ...prevCommits];
      });

      for (let i = 0; i < newCommits.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = newCommits.slice(i, i + BATCH_SIZE);
        await processCommitBatch(batch, signal);

        if (i + BATCH_SIZE < newCommits.length && !signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error('Commit check error:', error);
        setError(`Failed to check commits: ${error}`);
      }
    } finally {
      if (!signal.aborted) {
        setIsChecking(false);
        setIsInitializing(false);
        isFirstCheck.current = false;
      }
    }
  }, [
    checkInterval,
    isChecking,
    isEnabled,
    monoRepoPath,
    processCommitBatch,
    selectedFolders,
    setCommits,
    isCommitNotified
  ]);

  const debouncedCheckNewCommits = createDebounce(checkNewCommits, 300);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const runCheck = () => {
      debouncedCheckNewCommits();
      if (isEnabled && checkInterval > 0) {
        timerRef.current = window.setTimeout(runCheck, checkInterval * 60 * 1000);
      }
    };

    if (isEnabled && checkInterval > 0) {
      runCheck();
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [isEnabled, checkInterval, checkNewCommits]);

  if (isInitializing) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking for new commits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default CommitMonitor;
