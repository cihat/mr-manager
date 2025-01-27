// store/index.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GitHistoryStore } from '@/types';

const useStore = create<GitHistoryStore>()(
  persist(
    (set) => ({
      monoRepoPath: '',
      selectedFolder: null,
      error: '',
      currentView: 'libs',

      getLibsPath: (monoRepoPath: string): string => {
        if (!monoRepoPath) return '';
        return `${monoRepoPath}/packages/libs`;
      },

      getAppsPath: (monoRepoPath: string): string => {
        if (!monoRepoPath) return '';
        return `${monoRepoPath}/packages/apps`;
      },

      setCurrentView: (view) => set({ currentView: view }),
      setMonoRepoPath: (path) => set({ monoRepoPath: path }),
      resetMonoRepoPath: () => set({ monoRepoPath: '' }),
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'mono-repo-storage',
    }
  )
);

export default useStore;
