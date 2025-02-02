import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import useAppStore from "@/store";
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
  const perPage = 20;

  const { monoRepoPath, currentView, folders, selectedFolder, getLibsPath, getAppsPath, setSelectedFolder } = useAppStore();

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
    handleFolderClick,
    handleCommitClick,
    setIsDetailsOpen,
    setError,
    handleSearch,
    loadMore,
    setBranch,
    setRemote,
    references
  };
};

export default useGitHistory;
