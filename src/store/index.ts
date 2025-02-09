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
  soundEnabled: boolean;
  checkInterval: number;
  monitoredFolders: string[];
  selectedSound: string;
}

interface StoreState {
  monoRepoPath: string;
  selectedFolder: string | null;
  error: string;
  currentView: string; // Changed from 'libs' | 'apps' to string
  searchQuery: string;
  currentGeneratedFolder: string;
  folders: Folder[];
  docFolderName: string;
  favorites: string[];
  notificationSettings: NotificationSettings;
  packageFolders: string[]; // New field to store available package folders
}

interface StoreActions {
  getPackagePath: (monoRepoPath: string) => string; // Updated path getter
  setCurrentGeneratedFolder: (folderName: string) => void;
  setSearchQuery: (query: string) => void;
  setCurrentView: (view: string) => void; // Updated type
  setError: (error: string) => void;
  setMonoRepoPath: (path: string) => void;
  resetMonoRepoPath: () => void;
  setSelectedFolder: (folder: string) => void;
  setFolders: (folders: Folder[]) => void;
  toggleFavorite: (folderName: string) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setPackageFolders: (folders: string[]) => void; // New action
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
  packageFolders: [], // Initialize empty package folders array
  notificationSettings: {
    isEnabled: true,
    soundEnabled: true,
    selectedSound: 'sweet-kitty-meow',
    checkInterval: 15,
    monitoredFolders: []
  },
};

const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      getPackagePath: (monoRepoPath) => {
        const { currentView } = get();

        if (!monoRepoPath || !currentView) return '';

        return `${monoRepoPath}/packages/${currentView}`;
      },
      setPackageFolders: (folders) => set({ packageFolders: folders }),
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
        notificationSettings: state.notificationSettings,
        packageFolders: state.packageFolders, // Add to persisted state
      }),
    }
  )
);

export default useStore;
