import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

import { invoke } from '@tauri-apps/api/core';
import useAppStore, { NotificationSettings } from "@/store";
import { BasicCommit, DetailedCommit } from "@/types";
// @ts-ignore
import FuzzySearch from 'fuzzy-search';
import Fuse from 'fuse.js';

const useGitHistory = () => {
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [commits, setCommits] = useState<BasicCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<DetailedCommit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentRepoPath, setCurrentRepoPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [branch, setBranch] = useState('master');
  const [remote, setRemote] = useState('origin');
  const [references, setReferences] = useState<string[]>([]);
  const [lastCommitId, setLastCommitId] = useState<string | null>(null);
  const checkInterval = useRef<number | null>(null);
  const perPage = 20;

  const { monoRepoPath, currentView, folders, selectedFolder, notificationSettings, updateNotificationSettings, getLibsPath, getAppsPath, setSelectedFolder } = useAppStore();

  useEffect(() => {
    setSearchQuery('');
    setCommits([]);
  }, [currentView]);


  const handleListReferences = async () => {
    try {
      const refs = await invoke<string[]>('get_git_references', {
        path: monoRepoPath,
      });
      setReferences(refs);
    } catch (error) {
      console.error('Failed to load references:', error);
      setError(`Failed to load references: ${error instanceof Error ? error.message : error}`);
    }
  }

  useEffect(() => {
    handleListReferences();
  }, []);

  useEffect(() => {
    if (!notificationSettings.isEnabled) {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
      return;
    }

    if (currentRepoPath && selectedFolder) {
      // Clear existing interval
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }

      // Set new interval based on settings
      const intervalMs = notificationSettings.checkInterval * 60 * 1000;
      checkInterval.current = setInterval(checkNewCommits, intervalMs);

      // Initial check
      checkNewCommits();

      return () => {
        if (checkInterval.current) {
          clearInterval(checkInterval.current);
        }
      };
    }
  }, [currentRepoPath, selectedFolder, notificationSettings]);

  const handleSettingsChange = (newSettings: NotificationSettings) => {
    updateNotificationSettings(newSettings);
  };

  const handleFolderClick = async (folder: any) => {
    setCurrentPage(1);
    setLoading(true);
    setCommits([]);
    setSelectedFolder(folder.name);
    const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
    const fullPath = `${basePath}/${folder.name}`;
    setCurrentRepoPath(fullPath);
    try {
      const baslangic = performance.now();
      const commits = await invoke<BasicCommit[]>('list_folder_commits', {
        path: fullPath,
        page: 1,
        per_page: perPage,
        branch,
        remote
      });
      const bitis = performance.now();
      //time diff
      console.log('time diff >>', bitis - baslangic)
      const minutes = Math.floor((bitis - baslangic) / 60000);
      console.log('minutes >>', minutes)

      setCommits(commits);

      setError('');
    } catch (error) {
      console.error('Failed to load commits:', error);
      setError(`Failed to load commits: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoading(true);
    try {
      const nextPage = currentPage + 1;
      const newCommits = await invoke<BasicCommit[]>('list_folder_commits', {
        path: currentRepoPath,
        page: nextPage,
        per_page: perPage
      });
      if (newCommits?.length === 0) {
        // No more commits to load
        return;
      }
      setCommits(prev => [...prev, ...newCommits]);
      setCurrentPage(nextPage);
      setError('');
    } catch (error) {
      console.error('Failed to load more commits:', error);
      setError(`Failed to load more commits: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitClick = async (commit: BasicCommit) => {
    setDetailsLoading(true);
    try {
      const details = await invoke<DetailedCommit>('get_commit_details', {
        repoPath: currentRepoPath,
        commitId: commit.id,
      });
      setSelectedCommit(details);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load commit details:', error);
      setError(`Failed to load commit details: ${error instanceof Error ? error.message : error}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const searchedCommits = useMemo(() => {
    if (!searchQuery) return commits;

    const fuse = new Fuse(commits, {
      keys: ['author', 'message', 'id'],
      includeScore: true,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [commits, searchQuery]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const checkNewCommits = async () => {
    if (!currentRepoPath || !selectedFolder) return;

    // Notifications disabled ise kontrol etme
    if (!notificationSettings.isEnabled) return;

    // Seçili klasör monitör edilenler arasında değilse kontrol etme
    if (!notificationSettings.monitoredFolders.includes(selectedFolder)) return;

    try {
      const newCommit: BasicCommit = await invoke('check_new_commits', {
        path: currentRepoPath,
        branch,
        remote,
        lastCommitId: lastCommitId
      });

      console.log('newCommit >>', newCommit)


      if (newCommit) {
        // Update last commit ID
        setLastCommitId(newCommit.id);

        // Send notification
        const permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          if (permission !== 'granted') return;
        }

        await sendNotification({
          title: 'New Commit Detected',
          body: `New commit in ${selectedFolder} by ${newCommit.author}\n${newCommit.message}`,
        });

        // Refresh commits list
        const updatedCommits: BasicCommit[] = await invoke('list_folder_commits', {
          path: currentRepoPath,
          page: 1,
          per_page: perPage,
          branch,
          remote
        });

        setCommits(updatedCommits);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to check for new commits:', error);
      setError(`Failed to check for new commits: ${error instanceof Error ? error.message : error}`);
    }
  };


  return {
    loading,
    detailsLoading,
    error,
    commits: searchedCommits, // Return filtered commits instead of raw commits
    selectedCommit,
    isDetailsOpen,
    currentRepoPath,
    folders,
    selectedFolder,
    searchQuery,
    hasMore: commits?.length >= currentPage * perPage,
    references,
    notificationSettings,
    setCommits,
    setLoading,
    handleFolderClick,
    handleCommitClick,
    setIsDetailsOpen,
    setError,
    handleSearch,
    loadMore,
    setBranch,
    setRemote,
    handleSettingsChange
  };
};

export default useGitHistory;
