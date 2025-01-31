//@ts-nocheck
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import useGitHistoryStore from "@/store/gitHistory";
import { BasicCommit, DetailedCommit } from '@/types';

export const useCommitData = () => {
  const [commits, setCommits] = useState<BasicCommit[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<DetailedCommit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentRepoPath, setCurrentRepoPath] = useState('');

  // const { monoRepoPath, currentView, getLibsPath, getAppsPath, setSelectedFolder } = useGitHistoryStore();

  const handleCommitClick = async (commit: BasicCommit) => {
    setDetailsLoading(true);
    try {
      const details = await invoke<DetailedCommit>('get_commit_details', {
        repoPath: currentRepoPath,
        commitId: commit.id,
      });
      setSelectedCommit(details);
      setIsDetailsOpen(true);
    } catch (error: any) {
      setError(error.message || 'Failed to load commit details');
    } finally {
      setDetailsLoading(false);
    }
  };

  return {
    commits,
    error,
    loading,
    currentRepoPath,
    selectedCommit,
    isDetailsOpen,
    handleCommitClick,
    closeDetails: () => setIsDetailsOpen(false)
  };
};
