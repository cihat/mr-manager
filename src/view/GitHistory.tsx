//@ts-nocheck

import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import FolderList from "@/components/folder-list";
import { Loader2, GitCommit as GitCommitIcon, TimerReset, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BasicCommit } from '@/types';
import CommitList from '@/components/git-components/commit-list';
import useGitHistory from '@/hooks/useGithubHistory';
import CommitDetailsDialog from '@/components/git-components/commit-details-dialog';
import SubHeader from '@/components/sub-header';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReloadButton from '@/components/git-components/reload-button';

const RemoteSelect = ({ remotes = [], onValueChange }: { remotes: string[], onValueChange: (value: string) => void }) => (
  <Select defaultValue="upstream" onValueChange={onValueChange}>
    <SelectTrigger className="w-[120px]">
      <SelectValue placeholder="Origin" />
    </SelectTrigger>
    <SelectContent>
      {remotes.map((remote: string) => (
        <SelectItem key={remote} value={remote}>{remote}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const CommitSearchInput = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <Tooltip>
    <TooltipTrigger>
      <div className="relative w-48">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Search author, message, id'
          value={value}
          onChange={onChange}
          className='pl-8'
        />
      </div>
    </TooltipTrigger>
    <TooltipContent sideOffset={5}>
      Search commits by message, author, commit id
    </TooltipContent>
  </Tooltip>
);

const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex justify-center items-center h-full">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  </div>
);

type CommitListSection = {
  loading: boolean;
  commits: BasicCommit[];
  selectedFolder: string | null;
  onCommitClick: (commit: BasicCommit) => void;
  onLoadMore: () => void;
  hasMore: boolean;
};


const CommitListSection = ({ loading, commits, selectedFolder, onCommitClick, onLoadMore, hasMore }: CommitListSection) => {
  if (loading && commits?.length === 0) {
    return <LoadingSpinner message="Loading commits..." />;
  }

  if (commits?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <GitCommitIcon className="w-8 h-8 mb-2" />
        <p>{selectedFolder ? 'No commits found' : 'Select a folder to view commits'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CommitList commits={commits} onCommitClick={onCommitClick} />
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
};

const GitHistory = ({ className }: { className?: string }) => {
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
    searchQuery,
    handleSearch,
    loadMore,
    hasMore,
    setRemote,
    references: { remotes },
  } = useGitHistory();

  return (
    <div className={cn("", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SubHeader title='History' icon='history'>
        <div className='ml-auto mr-5 flex gap-2'>
          <RemoteSelect remotes={remotes} onValueChange={setRemote} />
          <CommitSearchInput value={searchQuery} onChange={handleSearch} />
          <ReloadButton />
        </div>
      </SubHeader>

      <div className="grid grid-cols-4 h-[calc(100vh-8rem)]">
        <div className="overflow-scroll max-h-[calc(100vh-136px)] scrollbar-hide">
          <FolderList
            folders={folders}
            onClick={handleFolderClick}
            icon={TimerReset}
            selectedFolder={selectedFolder}
          />
        </div>

        <div className="p-4 col-span-3 overflow-scroll max-h-[calc(100vh-136px)] scrollbar-hide">
          <CommitListSection
            loading={loading}
            commits={commits}
            selectedFolder={selectedFolder}
            onCommitClick={handleCommitClick}
            onLoadMore={loadMore}
            hasMore={hasMore}
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
