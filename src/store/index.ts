//@ts-nocheck

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      monoRepoPath: '',
      setMonoRepoPath: (path) => set({ monoRepoPath: path }),
      resetMonoRepoPath: () => set({ monoRepoPath: '' }),
    }),
    {
      name: 'mono-repo-storage',
    }
  )
);

export default useStore;
