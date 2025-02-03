import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Folder {
  name: string;
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
  isFavorite?: boolean;
}

export interface NotificationSettings {
  isEnabled: boolean;
  checkInterval: number;
  monitoredFolders: string[];
}

interface StoreState {
  monoRepoPath: string;
  selectedFolder: string | null;
  error: string;
  currentView: 'libs' | 'apps';
  searchQuery: string;
  currentGeneratedFolder: string;
  folders: Folder[];
  docFolderName: string;
  favorites: string[];
  notificationSettings: NotificationSettings;
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
  toggleFavorite: (folderName: string) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

const initialState: StoreState = {
  monoRepoPath: '',
  selectedFolder: null,
  error: '',
  currentView: 'apps',
  searchQuery: '',
  currentGeneratedFolder: '',
  folders: [],
  docFolderName: '.mr-manager',
  favorites: [],
  notificationSettings: {
    isEnabled: true,
    checkInterval: 15,
    monitoredFolders: []
  },
};

const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
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
        const { favorites } = get();
        const foldersWithFavorites = folders.map(folder => ({
          ...folder,
          isFavorite: favorites.includes(folder.name)
        }));
        set({ folders: foldersWithFavorites });
      },
      toggleFavorite: (folderName) => {
        set((state) => {
          const favorites = state.favorites.includes(folderName)
            ? state.favorites.filter(name => name !== folderName)
            : [...state.favorites, folderName];

          const updatedFolders = state.folders.map(folder => ({
            ...folder,
            isFavorite: favorites.includes(folder.name)
          }));

          return { favorites, folders: updatedFolders };
        });
      },
      setCurrentGeneratedFolder: (folderName) =>
        set({ currentGeneratedFolder: folderName }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCurrentView: (view) => set({ currentView: view }),
      setMonoRepoPath: (path) => set({ monoRepoPath: path }),
      resetMonoRepoPath: () => set({ monoRepoPath: '' }),
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      setError: (error) => set({ error }),
      updateNotificationSettings: (settings: Partial<NotificationSettings>) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings
          }
        }))
    }),
    {
      name: 'mono-repo-storage',
      partialize: (state) => ({
        monoRepoPath: state.monoRepoPath,
        currentView: state.currentView,
        selectedFolder: state.selectedFolder,
        favorites: state.favorites,
      }),
    }
  )
);

export default useStore;
