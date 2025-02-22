import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [remote, setRemote] = useState('upstream');
  const [references, setReferences] = useState<string[]>([]);
  const checkInterval = useRef<number | null>(null);
  const perPage = 20;

  const { monoRepoPath, folders, selectedFolder, notificationSettings, updateNotificationSettings, getPackagePath, setSelectedFolder } = useAppStore();

  //! Fix it this logic
  // useEffect(() => {
  //   setSearchQuery('');
  //   setCommits([]);
  // }, [currentView]);


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
    const basePath = getPackagePath(monoRepoPath);
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

  const handleFolderClickForNewCommits = async () => {
    setCurrentPage(1);
    setLoading(true);
    setCommits([]);
    setCurrentRepoPath(monoRepoPath)

    try {
      const newCommits = await invoke<BasicCommit[]>('get_new_commits', {
        path: monoRepoPath,
        remote,
        branch
      });

      setCommits(newCommits);
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

  const handleCommitClickForNew = async (commit: BasicCommit) => {
    setDetailsLoading(true);
    try {
      const details = await invoke<DetailedCommit>('get_new_commits_details', {
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

    if (!notificationSettings.isEnabled ||
      !notificationSettings.monitoredFolders.includes(selectedFolder)) {
      return;
    }

    try {
      const newCommits: BasicCommit[] = await invoke('get_new_commits', {
        path: currentRepoPath,
        remote: remote,
        branch: branch
      });

      if (newCommits && newCommits.length > 0) {
        // Send notification for each new commit
        const permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          if (permission !== 'granted') return;
        }

        for (const commit of newCommits) {
          await sendNotification({
            title: `New Commit in ${selectedFolder}`,
            body: `Author: ${commit.author}\n${commit.message}`
          });
        }

        // Update commits list with new commits at the top
        setCommits(prevCommits => [...newCommits, ...prevCommits]);
      }
    } catch (error) {
      console.error('Failed to check for new commits:', error);
      setError(`Failed to check for new commits: ${error instanceof Error ? error.message : error}`);
    }
  };

  const handleNextCommit = useCallback(() => {
    if (!selectedCommit || !commits.length) return;

    // Find the current commit index
    const currentIndex = commits.findIndex(
      commit => commit.id === selectedCommit.id
    );

    // If there's a next commit, select it
    if (currentIndex !== -1 && currentIndex < commits.length - 1) {
      handleCommitClickForNew(commits[currentIndex + 1]);
    }
    const hasMore = commits?.length >= currentPage * perPage;

    // If we're near the end, load more commits if available
    if (currentIndex >= commits.length - 3 && hasMore) {
      loadMore();
    }
  }, [selectedCommit, commits, handleCommitClickForNew, loadMore]);


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
    handleCommitClickForNew,
    setIsDetailsOpen,
    setError,
    handleSearch,
    loadMore,
    setBranch,
    setRemote,
    handleSettingsChange,
    handleFolderClickForNewCommits,
    handleNextCommit
  };
};

export default useGitHistory;
