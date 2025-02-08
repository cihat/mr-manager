import React, { useEffect, useRef, useState } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BasicCommit } from '@/types';
import useAppStore from '@/store';

interface CommitMonitorProps {
  selectedFolders: string[];
  checkInterval: number;
  isEnabled: boolean;
  remote?: string;
  branch?: string;
  monoRepoPath: string;
}

const CommitMonitor: React.FC<CommitMonitorProps> = ({
  selectedFolders,
  checkInterval,
  isEnabled,
  remote = 'upstream',
  branch = 'master',
  monoRepoPath
}) => {
  const [error, setError] = useState('');
  const timerRef = useRef<null | number>(null);
  const { currentView, getLibsPath, getAppsPath } = useAppStore();

  // Load notified commits from localStorage on component mount
  const [notifiedCommits, setNotifiedCommits] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('notifiedCommits');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  // Update localStorage whenever notifiedCommits changes
  useEffect(() => {
    try {
      localStorage.setItem('notifiedCommits', JSON.stringify([...notifiedCommits]));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [notifiedCommits]);

  // Clean up old notifications after 7 days
  useEffect(() => {
    const cleanupOldNotifications = () => {
      try {
        const stored = localStorage.getItem('notifiedCommits');
        if (stored) {
          const commits = JSON.parse(stored);
          localStorage.setItem('notifiedCommits', JSON.stringify(commits.slice(-1000))); // Keep last 1000 commits
        }
      } catch (error) {
        console.error('Failed to cleanup notifications:', error);
      }
    };

    // Run cleanup daily
    const cleanup = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    return () => clearInterval(cleanup);
  }, []);

  const checkNewCommits = async () => {
    if (!isEnabled || selectedFolders.length === 0) return;

    try {
      const permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        if (permission !== 'granted') return;
      }

      const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);

      for (const folder of selectedFolders) {
        const folderPath = `${basePath}/${folder}`;

        const newCommits: BasicCommit[] = await invoke('get_new_commits', {
          path: monoRepoPath,
          remote,
          branch
        });

        for (const commit of newCommits) {
          // Skip if we've already notified about this commit
          if (notifiedCommits.has(commit.id)) continue;

          const details = await invoke('get_new_commits_details', {
            repoPath: folderPath,
            commitId: commit.id,
          }) as {
            changes: any;
            files: { path: string }[];
          };

          // Check if the commit affects the monitored folder
          if (details.changes.some((files: { file: string; }) => files.file.includes(folder))) {
            await sendNotification({
              title: `New Commit in ${folder}`,
              body: `${commit.author}: ${commit.message}`
            });

            // Mark this commit as notified
            setNotifiedCommits(prev => new Set([...prev, commit.id]));
          }
        }
      }
    } catch (error) {
      setError(`Failed to check commits: ${error}`);
      console.error('Commit check error:', error);
    }
  };

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isEnabled && checkInterval > 0) {
      checkNewCommits(); // Initial check
      timerRef.current = setInterval(checkNewCommits, checkInterval * 5 * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isEnabled, checkInterval, monoRepoPath]);

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
