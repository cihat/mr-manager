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
  const [lastCheckedCommits, setLastCheckedCommits] = useState<{ [key: string]: boolean }>({});
  const { currentView, getLibsPath, getAppsPath } = useAppStore();

  const checkNewCommits = async () => {
    if (!isEnabled || selectedFolders.length === 0) return;

    try {
      // Check notifications permission
      const permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        if (permission !== 'granted') return;
      }
      const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);

      // Check each selected folder
      for (const folder of selectedFolders) {
        const folderPath = `${basePath}/${folder}`;

        // Get new commits for the folder
        const newCommits: BasicCommit[] = await invoke('get_new_commits', {
          path: monoRepoPath,
          remote,
          branch
        });

        // Get details for each new commit
        for (const commit of newCommits) {
          // Skip if we've already processed this commit
          if (lastCheckedCommits[commit.id]) continue;

          const details = await invoke('get_new_commits_details', {
            repoPath: folderPath,
            commitId: commit.id,
          }) as {
            changes: any; files: { path: string }[]
          };

          // Check if the commit affects the monitored folder
          if (details.changes.some((files: { file: string; }) => files.file.includes(folder))) {
            console.log('aliveli');

            await sendNotification({
              title: `New Commit in ${folder}`,
              // body: `${commit.author}: ${commit.message}\nFiles changed: ${details.map((file: { path: string; }) => file.path).join(', ')}`
              body: `${commit.author}: ${commit.message}`,
              sound: 'default',
              channelId: 'commit-notifications'
            });

            // Update last checked commits
            setLastCheckedCommits(prev => ({
              ...prev,
              [commit.id]: true
            }));
          }
        }
      }
    } catch (error) {
      setError(`Failed to check commits: ${error}`);
      console.error('Commit check error:', error);
    }
  };

  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    console.log('CommitMonitor: Setting up new timer');


    // Set up new timer if enabled
    if (isEnabled && checkInterval > 0) {
      // Initial check
      checkNewCommits();

      // Set up interval
      timerRef.current = setInterval(checkNewCommits, checkInterval * 9 * 1000);
    }

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isEnabled, checkInterval, selectedFolders, monoRepoPath]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null; // This is a background component
};

export default CommitMonitor;
