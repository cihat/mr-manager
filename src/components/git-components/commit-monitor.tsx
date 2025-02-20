import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { BasicCommit } from '@/types';
import useAppStore from '@/store';
import { notificationSound } from '@/lib/notification-sound';
import useGitHistory from '@/hooks/useGithubHistory';

// Constants
const BATCH_SIZE = 3;
const BATCH_DELAY = 300;
const MAX_COMMITS_TO_PROCESS = 60;
const COMMIT_CHECK_TIMEOUT = 8000;
const NOTIFIED_COMMITS_KEY = 'notifiedCommits';
const SOUND_THROTTLE_PERIOD = 10000; // 10 seconds throttle for sound

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

  const remote = 'upstream';
  const branch = 'master';
  
  const {
    monitoredFolders: selectedFolders,
    checkInterval,
    isEnabled,
    enableAllFolderNotifications,
    selectedSound
  } = notificationSettings;

  // Memoize settings to prevent unnecessary re-renders
  const settings = useMemo(() => ({
    selectedFolders,
    checkInterval,
    isEnabled,
    enableAllFolderNotifications,
    selectedSound,
    basePath: getPackagePath(monoRepoPath)
  }), [
    selectedFolders,
    checkInterval,
    isEnabled,
    enableAllFolderNotifications,
    selectedSound,
    getPackagePath,
    monoRepoPath
  ]);

  // Throttled notification sound function
  const playNotificationSound = useCallback(async () => {
    const now = Date.now();
    if (now - lastSoundPlayed.current > SOUND_THROTTLE_PERIOD) {
      await notificationSound(selectedSound);
      lastSoundPlayed.current = now;
    }
  }, [selectedSound]);

  // Cached local storage functions
  const storageManager = useMemo(() => {
    return {
      getNotifiedCommits: (): string[] => {
        try {
          const stored = localStorage.getItem(NOTIFIED_COMMITS_KEY);
          return stored ? JSON.parse(stored) : [];
        } catch {
          return [];
        }
      },
      
      addNotifiedCommit: (commitId: string) => {
        try {
          const notifiedCommits = storageManager.getNotifiedCommits();
          if (!notifiedCommits.includes(commitId)) {
            // Maintain a rolling list of last 1000 commits to prevent localStorage bloat
            const updatedList = [...notifiedCommits, commitId].slice(-1000);
            localStorage.setItem(NOTIFIED_COMMITS_KEY, JSON.stringify(updatedList));
          }
        } catch (error) {
          console.error('Failed to save notified commit:', error);
        }
      },
      
      isCommitNotified: (commitId: string): boolean => {
        const notifiedCommits = storageManager.getNotifiedCommits();
        return notifiedCommits.includes(commitId);
      }
    };
  }, []);

  // Process a batch of commits
  const processCommitBatch = useCallback(async (
    commits: BasicCommit[],
    signal: AbortSignal
  ) => {
    if (signal.aborted) return;
    
    const { basePath, selectedFolders, enableAllFolderNotifications } = settings;
    const newCommits = commits.filter(commit => !storageManager.isCommitNotified(commit.id));
    
    if (newCommits.length === 0) return;
    
    let hasPlayedSound = false;

    for (const commit of newCommits) {
      if (signal.aborted) break;
      if (storageManager.isCommitNotified(commit.id)) continue;

      for (const folder of selectedFolders) {
        if (signal.aborted) break;

        const folderPath = `${basePath}/${folder}`;
        try {
          const details = await invoke('get_new_commits_details', {
            repoPath: folderPath,
            commitId: commit.id,
          }) as {
            changes: any;
            files: { path: string }[];
          };

          const shouldNotify = enableAllFolderNotifications || 
            details.changes.some((files: { file: string; }) => files.file.includes(folder));

          if (shouldNotify && !storageManager.isCommitNotified(commit.id)) {
            // Play sound only once per batch if there are notifications
            if (!hasPlayedSound) {
              await playNotificationSound();
              hasPlayedSound = true;
            }
            
            await sendNotification({
              title: `New Commit in ${folder}`,
              body: `${commit.author}: ${commit.message}`,
            });
            
            storageManager.addNotifiedCommit(commit.id);
            break;
          }
        } catch (error) {
          console.warn(`Skipping commit ${commit.id} for folder ${folder}:`, error);
        }
      }
    }
  }, [settings, playNotificationSound, storageManager]);

  // Custom debounce implementation with TypeScript types
  const createDebounce = <T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: number | null = null;
    return function executedFunction(...args: Parameters<T>): void {
      const later = () => {
        clearTimeout(timeout!);
        func(...args);
      };
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  };

  // Custom debounced check for new commits
  const debouncedCommitCheck = useMemo(() => {
    let isRunning = false;
    const checkFunction = async () => {
      const now = Date.now();
      
      if (!isFirstCheck.current && now - lastCheckedTimestamp.current < settings.checkInterval * 500) {
        return;
      }

      if (!settings.isEnabled || settings.selectedFolders.length === 0 || (isChecking && !isFirstCheck.current)) {
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
          remote,
          branch
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Commit fetch timeout')), COMMIT_CHECK_TIMEOUT);
        });

        let newCommits = await Promise.race([
          newCommitsPromise,
          timeoutPromise
        ]) as BasicCommit[];

        if (signal.aborted) return;

        // Filter commits
        newCommits = newCommits
          .filter(commit => !storageManager.isCommitNotified(commit.id))
          .slice(0, MAX_COMMITS_TO_PROCESS);

        if (newCommits.length === 0) {
          setIsChecking(false);
          setIsInitializing(false);
          isFirstCheck.current = false;
          return;
        }

        // Update commit history
        setCommits(prevCommits => {
          const uniqueNewCommits = newCommits.filter(
            newCommit => !prevCommits.some(existingCommit => existingCommit.id === newCommit.id)
          );
          return [...uniqueNewCommits, ...prevCommits];
        });

        // Process commits in batches
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
    };
    
    return createDebounce(() => {
      if (isRunning) return;
      isRunning = true;
      checkFunction().finally(() => {
        isRunning = false;
      });
    }, 300);
  }, [isChecking, monoRepoPath, processCommitBatch, setCommits, settings, storageManager]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      // No need for cancel with our custom implementation
    };
  }, [debouncedCommitCheck]);

  // Timer effect
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const runCheck = () => {
      debouncedCommitCheck();
      if (settings.isEnabled && settings.checkInterval > 0) {
        timerRef.current = window.setTimeout(runCheck, settings.checkInterval * 60 * 1000);
      }
    };

    if (settings.isEnabled && settings.checkInterval > 0) {
      runCheck();
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [debouncedCommitCheck, settings.isEnabled, settings.checkInterval]);

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
