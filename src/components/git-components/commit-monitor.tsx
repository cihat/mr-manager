import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BasicCommit } from '@/types';
import useAppStore from '@/store';
import { notificationSound } from '@/lib/notification-sound';

interface CommitMonitorProps {
  selectedFolders: string[];
  checkInterval: number;
  isEnabled: boolean;
  remote?: string;
  branch?: string;
  monoRepoPath: string;
}

const BATCH_SIZE = 1;
const BATCH_DELAY = 400;
const MAX_COMMITS_TO_PROCESS = 30;
const COMMIT_CHECK_TIMEOUT = 8000;

const CommitMonitor: React.FC<CommitMonitorProps> = () => {
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const timerRef = useRef<null | number>(null);
  const lastCheckedTimestamp = useRef<number>(0);

  const {
    currentView,
    getLibsPath,
    getAppsPath,
    monoRepoPath,
    notificationSettings
  } = useAppStore();

  const remote = 'upstream';
  const branch = 'master';
  const {
    monitoredFolders: selectedFolders,
    checkInterval,
    isEnabled
  } = notificationSettings;

  // Optimize localStorage usage with debouncing
  const [notifiedCommits, setNotifiedCommits] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('notifiedCommits');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  // Debounced localStorage update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('notifiedCommits', JSON.stringify([...notifiedCommits]));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notifiedCommits]);

  // Memoize commit batch processing
  const processCommitBatch = useCallback(async (
    commits: BasicCommit[],
    basePath: string,
    signal: AbortSignal
  ) => {
    // Process commits in parallel but with limits
    const results = await Promise.allSettled(
      commits.map(async (commit) => {
        if (signal.aborted || notifiedCommits.has(commit.id)) return;

        const folderPromises = selectedFolders.map(async (folder) => {
          if (signal.aborted) return;

          const folderPath = `${basePath}/${folder}`;
          try {
            const details = await invoke('get_new_commits_details', {
              repoPath: folderPath,
              commitId: commit.id,
            }) as {
              changes: any;
              files: { path: string }[];
            };

            if (details.changes.some((files: { file: string; }) =>
              files.file.includes(folder)
            )) {
              return { commit, folder };
            }
          } catch (error) {
            console.warn(
              `Skipping commit ${commit.id} for folder ${folder}:`,
              error
            );
          }
          return null;
        });

        const results = await Promise.all(folderPromises);
        return results.filter(Boolean);
      })
    );

    // Process notifications after all checks
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        for (const notification of result.value) {
          if (notification) {
            const { commit, folder } = notification;
            await notificationSound();
            await sendNotification({
              title: `New Commit in ${folder}`,
              body: `${commit.author}: ${commit.message}`,
            });
            setNotifiedCommits(prev => new Set([...prev, commit.id]));
          }
        }
      }
    }
  }, [selectedFolders, notifiedCommits]);

  const checkNewCommits = useCallback(async () => {
    // Throttle checks
    const now = Date.now();
    if (now - lastCheckedTimestamp.current < checkInterval * 500) {
      return;
    }

    if (!isEnabled || selectedFolders.length === 0 || isChecking) {
      return;
    }

    // Cancel any ongoing check
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
          return;
        }
      }

      const basePath = currentView === "libs"
        ? getLibsPath(monoRepoPath)
        : getAppsPath(monoRepoPath);

      // Get initial commits list with timeout
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

      // Limit the number of commits to process
      newCommits = newCommits.slice(0, MAX_COMMITS_TO_PROCESS);

      // Process commits in smaller batches with delays
      for (let i = 0; i < newCommits.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = newCommits.slice(i, i + BATCH_SIZE);
        await processCommitBatch(batch, basePath, signal);

        if (i + BATCH_SIZE < newCommits.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
        console.log('Processed commits:', i + batch.length);

      }
    } catch (error) {
      if (!signal.aborted) {
        console.error('Commit check error:', error);
        setError(`Failed to check commits: ${error}`);
      }
    } finally {
      if (!signal.aborted) {
        setIsChecking(false);
      }
    }
  }, [isEnabled, checkInterval, selectedFolders, currentView, monoRepoPath, processCommitBatch]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isEnabled && checkInterval > 0) {
      checkNewCommits();
      timerRef.current = window.setInterval(checkNewCommits, checkInterval * 60 * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isEnabled, checkInterval, checkNewCommits]);

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
