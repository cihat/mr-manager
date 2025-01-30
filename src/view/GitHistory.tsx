import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FolderList from "@/components/folder-list";
import useGitHistoryStore from "@/store/gitHistory";
import useAppStore from "@/store";
import { Loader2, GitCommit as GitCommitIcon, TimerReset, History } from "lucide-react";
import { cn } from "@/lib/utils";
import CommitDetails from '@/components/git-components/commit-details';
import { BasicCommit, DetailedCommit } from '@/types';
import CommitList from '@/components/git-components/commit-list';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex justify-center items-center h-full">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  </div>
);

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <Alert variant="destructive">
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

const CommitListSection: React.FC<{
  loading: boolean;
  commits: BasicCommit[];
  selectedFolder: string | null;
  onCommitClick: (commit: BasicCommit) => void;
}> = ({ loading, commits, selectedFolder, onCommitClick }) => {
  if (loading) return <LoadingSpinner message="Loading commits..." />;

  return commits.length > 0 ? (
    <CommitList commits={commits} onCommitClick={onCommitClick} />
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <GitCommitIcon className="w-8 h-8 mb-2" />
      <p>{selectedFolder ? 'No commits found' : 'Select a folder to view commits'}</p>
    </div>
  );
};

const FolderListSection: React.FC<{
  folders: any[];
  onFolderClick: (folder: any) => void;
}> = ({ folders, onFolderClick }) => (
  <div className="overflow-scroll max-h-[calc(100vh-136px)]">
    <FolderList folders={folders} onClick={onFolderClick} icon={TimerReset} />
  </div>
);

const CommitDetailsDialog: React.FC<{
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedCommit: DetailedCommit | null;
  detailsLoading: boolean;
  currentRepoPath: string;
}> = ({ isDetailsOpen, setIsDetailsOpen, selectedCommit, detailsLoading, currentRepoPath }) => (
  <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
    <DialogContent className="max-w-[90vw] h-[90vh] p-6 block">
      <DialogHeader>
        <DialogTitle>Commit Details</DialogTitle>
      </DialogHeader>
      {detailsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : selectedCommit && (
        <div className="h-[calc(90vh-8rem)]">
          <CommitDetails commit={selectedCommit} repoPath={currentRepoPath} />
        </div>
      )}
    </DialogContent>
  </Dialog>
);

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

const Header = () => (
  <div className="flex items-center pl-3 pt-2 pb-0 bg-background">
    <History className="w-8 h-8" />
    <h3 className="font-semibold text-2xl">History</h3>
  </div>
);


const GitHistory: React.FC<{ className?: string }> = ({ className }) => {
  const {
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
  } = useGitHistory();

  return (
    <div className={cn("", className)}>
      {error && <ErrorAlert message={error} />}

      <Header />

      <div className="grid grid-cols-4 h-[calc(100vh-8rem)]">
        <FolderListSection folders={folders} onFolderClick={handleFolderClick} />

        <div className="p-4 col-span-3 overflow-scroll max-h-[calc(100vh-136px)]">
          <CommitListSection
            loading={loading}
            commits={commits}
            selectedFolder={selectedFolder}
            onCommitClick={handleCommitClick}
          />
        </div>
      </div>

      <CommitDetailsDialog
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        selectedCommit={selectedCommit}
        detailsLoading={detailsLoading}
        currentRepoPath={currentRepoPath}
      />
    </div>
  );
};

export default GitHistory;
