//@ts-nocheck

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  monoRepoPath: string;
  selectedFolder: string | null;
  error: string;
  setError: (error: string) => void;
  setMonoRepoPath: (path: string) => void;
  resetMonoRepoPath: () => void;
  setSelectedFolder: (folder: string) => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      monoRepoPath: '',
      selectedFolder: null,
      error: '',
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
