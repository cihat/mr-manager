import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import useGitHistoryStore from "@/store/gitHistory";
import useAppStore from "@/store";

export const useFolderData = () => {
  const { monoRepoPath, currentView, getLibsPath, getAppsPath } = useGitHistoryStore();
  const { folders, setFolders } = useAppStore();

  useEffect(() => {
    const loadFolders = async () => {
      const basePath = currentView === "libs"
        ? getLibsPath(monoRepoPath)
        : getAppsPath(monoRepoPath);

      try {
        const result = await invoke<string[]>('list_folders', { path: basePath });
        setFolders(result.map(name => ({
          name,
          isTypeScript: false,
          isLoading: false,
          isSelected: false
        })));
      } catch (error: any) {
        console.error('Failed to load folders:', error);
        return error.message || 'Failed to load folders';
      }
    };

    loadFolders();
  }, [currentView, monoRepoPath, getLibsPath, getAppsPath, setFolders]);

  return { folders };
};
