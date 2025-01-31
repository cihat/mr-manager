import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import FolderList from "@/components/folder-list";
import { Loader2, GitCommit as GitCommitIcon, TimerReset, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { BasicCommit } from '@/types';
import CommitList from '@/components/git-components/commit-list';
import useGitHistory from '@/hooks/useGithubHistory';
import CommitDetailsDialog from '@/components/git-components/commit-details-dialog';

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
  selectedFolder: any
}> = ({ folders, onFolderClick, selectedFolder }) => (
  <div className="overflow-scroll max-h-[calc(100vh-136px)]">
    <FolderList folders={folders} onClick={onFolderClick} icon={TimerReset} selectedFolder={selectedFolder} />
  </div>
);

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
        <FolderListSection folders={folders} onFolderClick={handleFolderClick} selectedFolder={selectedFolder} />

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
