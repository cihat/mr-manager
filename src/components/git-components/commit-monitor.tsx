import React, { useEffect, useRef, useState } from 'react';
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

const CommitMonitor: React.FC = () => {
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const abortController = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCheckedTimestamp = useRef<number>(0);
  const isFirstCheck = useRef<boolean>(true);

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
    enableAllFolderNotifications
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
    const newCommits = commits.filter(commit => !isCommitNotified(commit.id));

    if (newCommits.length === 0) {
      return;
    }

    for (const commit of newCommits) {
      if (signal.aborted) break;

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

          //! Refactor this to use a better check
          if (enableAllFolderNotifications) {
            if (!isCommitNotified(commit.id)) {
              await notificationSound(notificationSettings.selectedSound);
              await sendNotification({
                title: `New Commit in ${folder}`,
                body: `${commit.author}: ${commit.message}`,
              });
              addNotifiedCommit(commit.id);
              break;
            }
            return;
          }

          if (details.changes.some((files: { file: string; }) =>
            files.file.includes(folder)
          )) {
            if (!isCommitNotified(commit.id)) {
              await notificationSound(notificationSettings.selectedSound);
              await sendNotification({
                title: `New Commit in ${folder}`,
                body: `${commit.author}: ${commit.message}`,
              });
              addNotifiedCommit(commit.id);
              break;
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

      newCommits = newCommits
        .filter(commit => !isCommitNotified(commit.id))
        .slice(0, MAX_COMMITS_TO_PROCESS);

      if (newCommits.length === 0) {
        setIsChecking(false);
        setIsInitializing(false);
        isFirstCheck.current = false;
        return;
      }

      setCommits(prevCommits => [...newCommits, ...prevCommits]);

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
        setIsInitializing(false);
        isFirstCheck.current = false;
      }
    }
  });

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
