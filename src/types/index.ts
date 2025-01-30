// types/git.ts
export interface GitChange {
  status: string;
  file: string;
}

export interface GitCommit {
  message: string;
  author: string;
  date: number;
  changes: GitChange[];
}

export interface FolderItem {
  name: string;
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

// Tauri command interfaces
export interface TauriCommands {
  list_folders: (path: string) => Promise<string[]>;
  get_git_history: (path: string) => Promise<GitCommit[]>;
}

// Props interfaces
export interface CommitListProps {
  commits: GitCommit[];
}

export interface GitHistoryProps {
  className?: string;
}

// Store types
export interface GitHistoryStore {
  monoRepoPath: string;
  selectedFolder: string | null;
  error: string;
  currentView: 'libs' | 'apps';
  getLibsPath: (monoRepoPath: string) => string;
  getAppsPath: (monoRepoPath: string) => string;
  setCurrentView: (view: 'libs' | 'apps') => void;
  setError: (error: string) => void;
  setMonoRepoPath: (path: string) => void;
  resetMonoRepoPath: () => void;
  setSelectedFolder: (folder: string | null) => void;
}


export interface BasicCommit {
  id: string;
  message: string;
  author: string;
  date: number;
  remote_url: string;
}

export interface DetailedCommit extends BasicCommit {
  changes: GitChange[];
}
