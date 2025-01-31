import React from "react";
import useGitHistoryStore from "@/store/gitHistory";
import { invoke } from '@tauri-apps/api/core';
import useAppStore from "@/store";
import { BasicCommit, DetailedCommit } from "@/types";

const useGitHistory = () => {
  const [loading, setLoading] = React.useState(false);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [commits, setCommits] = React.useState<BasicCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = React.useState<DetailedCommit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [currentRepoPath, setCurrentRepoPath] = React.useState('');

  const { monoRepoPath, selectedFolder, getLibsPath, getAppsPath, setSelectedFolder } = useGitHistoryStore();
  const { currentView, folders, setFolders } = useAppStore();

  const loadFolders = React.useCallback(async () => {
    const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
    try {
      const result = await invoke<string[]>('list_folders', { path: basePath });
      setFolders(result.map(name => ({ name, isTypeScript: false, isLoading: false, isSelected: false })));
      setError('');
    } catch (error) {
      console.error('Failed to load folders:', error);
      setError(`Failed to load folders: ${error instanceof Error ? error.message : error}`);
      setFolders([]);
    }
  }, [currentView, monoRepoPath, getLibsPath, getAppsPath, setFolders]);

  React.useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleFolderClick = async (folder: any) => {
    setLoading(true);
    setCommits([]);
    setSelectedFolder(folder.name);

    const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
    const fullPath = `${basePath}/${folder.name}`;
    setCurrentRepoPath(fullPath);

    try {
      const commits = await invoke<BasicCommit[]>('list_folder_commits', { path: fullPath, limit: 50 });
      setCommits(commits);
      setError('');
    } catch (error) {
      console.error('Failed to load commits:', error);
      setError(`Failed to load commits: ${error instanceof Error ? error.message : error}`);
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

  return {
    loading,
    detailsLoading,
    error,
    commits,
    selectedCommit,
    isDetailsOpen,
    currentRepoPath,
    folders,
    selectedFolder,
    handleFolderClick,
    handleCommitClick,
    setIsDetailsOpen,
    setError,
  };
};

export default useGitHistory
