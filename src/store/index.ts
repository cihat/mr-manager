import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Folder {
  name: string;
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

interface StoreState {
  monoRepoPath: string;
  selectedFolder: string | null;
  error: string;
  currentView: 'libs' | 'apps';
  searchQuery: string;
  currentGeneratedFolder: string;
  folders: Folder[];
}

interface StoreActions {
  getLibsPath: (monoRepoPath: string) => string;
  getAppsPath: (monoRepoPath: string) => string;
  setCurrentGeneratedFolder: (folderName: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: 'libs' | 'apps') => void;
  setError: (error: string) => void;
  setMonoRepoPath: (path: string) => void;
  resetMonoRepoPath: () => void;
  setSelectedFolder: (folder: string) => void;
  setFolders: (folders: Folder[]) => void;
}

const initialState: StoreState = {
  monoRepoPath: '',
  selectedFolder: null,
  error: '',
  currentView: 'libs',
  searchQuery: '',
  currentGeneratedFolder: '',
  folders: [],
};

const useStore = create<StoreState & StoreActions>()(
  persist(
    (set) => ({
      ...initialState,

      getLibsPath: (monoRepoPath) => {
        if (!monoRepoPath) return '';
        return `${monoRepoPath}/packages/libs`;
      },
      getAppsPath: (monoRepoPath) => {
        if (!monoRepoPath) return '';
        return `${monoRepoPath}/packages/apps`;
      },
      setFolders(folders) {
        set({ folders });
      },
      setCurrentGeneratedFolder: (folderName) =>
        set({ currentGeneratedFolder: folderName }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCurrentView: (view) => set({ currentView: view }),
      setMonoRepoPath: (path) => set({ monoRepoPath: path }),
      resetMonoRepoPath: () => set({ monoRepoPath: '' }),
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'mono-repo-storage',
      partialize: (state) => ({
        monoRepoPath: state.monoRepoPath,
        currentView: state.currentView,
        selectedFolder: state.selectedFolder,
      }),
    }
  )
);

export default useStore;
