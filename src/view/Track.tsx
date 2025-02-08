//@ts-nocheck

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GitCommit as GitCommitIcon, RefreshCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BasicCommit } from '@/types';
import CommitList from '@/components/git-components/commit-list';
import useGitHistory from '@/hooks/useGithubHistory';
import CommitDetailsDialog from '@/components/git-components/commit-details-dialog';
import SubHeader from '@/components/sub-header';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import NotificationSettings from '@/components/git-components/notification-settings';

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
  selectedFolder: string;
  onCommitClick: (commit: BasicCommit) => void;
  onLoadMore: () => void;
  hasMore: boolean;
};

const CommitListSection = ({ loading, commits, selectedFolder, onCommitClick }: CommitListSection) => {
  if (loading || commits?.length === 0) {
    return <LoadingSpinner message="Loading commits..." />;
  }

  if (commits?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <GitCommitIcon className="w-8 h-8 mb-2" />
        <p>{selectedFolder ? 'No new commits found' : 'Select a folder to view new commits'}</p>
      </div>
    );
  }

  return <CommitList commits={commits} onCommitClick={onCommitClick} />;
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
    handleFolderClickForNewCommits,
    handleCommitClickForNew,
    setIsDetailsOpen,
    searchQuery,
    handleSearch,
    loadMore,
    hasMore,
    notificationSettings,
    handleSettingsChange
  } = useGitHistory();

  const [refreshing, setRefreshing] = useState(false);
  const [initializationLoading, setInitializationLoading] = useState(false);

  const initializeNewCommits = useCallback(async () => {
    setInitializationLoading(true);
    try {
      await handleFolderClickForNewCommits();
    } finally {
      setInitializationLoading(false);
    }
  }, [selectedFolder, handleFolderClickForNewCommits]);

  useEffect(() => {
    initializeNewCommits();
  }, [refreshing]);

  const isLoading = loading || initializationLoading;

  return (
    <div className={cn("", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SubHeader title='Track' icon='view'>
        <div className='ml-auto mr-5 flex gap-2'>
          <CommitSearchInput value={searchQuery} onChange={handleSearch} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRefreshing(prev => !prev)}
            disabled={isLoading}
            className={className}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <NotificationSettings
            folders={folders}
            onSettingsChange={handleSettingsChange}
            defaultInterval={notificationSettings.checkInterval}
            defaultEnabledFolders={notificationSettings.monitoredFolders}
          />
        </div>
      </SubHeader>

      <div className="grid grid-cols-4 h-[calc(100vh-8rem)]">
        <div className="p-4 col-span-4 overflow-scroll max-h-[calc(100vh-136px)] scrollbar-hide">
          <CommitListSection
            loading={isLoading}
            commits={commits}
            selectedFolder={selectedFolder}
            onCommitClick={handleCommitClickForNew}
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
