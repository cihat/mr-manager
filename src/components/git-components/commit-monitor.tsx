import React, { useEffect, useRef, useState } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BasicCommit } from '@/types';
import useAppStore from '@/store';
import { notificationSound } from '@/lib/notification-sound';

const BATCH_SIZE = 3;
const BATCH_DELAY = 300;
const MAX_COMMITS_TO_PROCESS = 60;
const COMMIT_CHECK_TIMEOUT = 8000;

const NOTIFIED_COMMITS_KEY = 'notifiedCommits';

const CommitMonitor: React.FC = () => {
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCheckedTimestamp = useRef<number>(0);

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
    isEnabled
  } = notificationSettings;

  // Get notified commits from localStorage
  const getNotifiedCommits = (): string[] => {
    try {
      const stored = localStorage.getItem(NOTIFIED_COMMITS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Add commit to notified list
  const addNotifiedCommit = (commitId: string) => {
    try {
      const notifiedCommits = getNotifiedCommits();
      if (!notifiedCommits.includes(commitId)) {
        notifiedCommits.push(commitId);
        localStorage.setItem(NOTIFIED_COMMITS_KEY, JSON.stringify(notifiedCommits));
      }
    } catch (error) {
      console.error('Failed to save notified commit:', error);
    }
  };

  // Check if commit is already notified
  const isCommitNotified = (commitId: string): boolean => {
    const notifiedCommits = getNotifiedCommits();
    return notifiedCommits.includes(commitId);
  };

  const processCommitBatchRef = useRef(async (
    commits: BasicCommit[],
    basePath: string,
    signal: AbortSignal
  ) => {
    // Filter out already notified commits first
    const newCommits = commits.filter(commit => !isCommitNotified(commit.id));

    if (newCommits.length === 0) {
      return;
    }

    for (const commit of newCommits) {
      if (signal.aborted) break;

      // Double check if commit is still not notified
      if (isCommitNotified(commit.id)) {
        continue;
      }

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

          if (details.changes.some((files: { file: string; }) =>
            files.file.includes(folder)
          )) {
            // Final check before notification
            if (!isCommitNotified(commit.id)) {
              await notificationSound();
              await sendNotification({
                title: `New Commit in ${folder}`,
                body: `${commit.author}: ${commit.message}`,
              });
              addNotifiedCommit(commit.id);
              break; // Exit folder loop after notification
            }
          }
        } catch (error) {
          console.warn(
            `Skipping commit ${commit.id} for folder ${folder}:`,
            error
          );
        }
      }
    }
  });

  const checkNewCommitsRef = useRef(async () => {
    const now = Date.now();
    console.log('Checking new commits...');

    if (now - lastCheckedTimestamp.current < checkInterval * 500) {
      return;
    }

    if (!isEnabled || selectedFolders.length === 0 || isChecking) {
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
          return;
        }
      }

      const basePath = getPackagePath(monoRepoPath);

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

      // Filter already notified commits
      newCommits = newCommits
        .filter(commit => !isCommitNotified(commit.id))
        .slice(0, MAX_COMMITS_TO_PROCESS);

      if (newCommits.length === 0) {
        setIsChecking(false);
        return;
      }

      for (let i = 0; i < newCommits.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = newCommits.slice(i, i + BATCH_SIZE);
        await processCommitBatchRef.current(batch, basePath, signal);

        if (i + BATCH_SIZE < newCommits.length) {
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
      }
    }
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    const runCheck = () => {
      checkNewCommitsRef.current();
      timerRef.current = window.setTimeout(runCheck, checkInterval * 60 * 1000);
    };

    if (isEnabled && checkInterval > 0) {
      runCheck();
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isEnabled, checkInterval]);

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
