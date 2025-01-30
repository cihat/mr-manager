import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FolderList from "@/components/folder-list";
import useGitHistoryStore from "@/store/gitHistory";
import useAppStore from "@/store";
import { Loader2, GitCommit as GitCommitIcon, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";
import CommitDetails from '@/components/git-components/commit-details';
import { BasicCommit, DetailedCommit } from '@/types';
import CommitList from '@/components/git-components/commit-list';

const GitHistory: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [commits, setCommits] = useState<BasicCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<DetailedCommit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentRepoPath, setCurrentRepoPath] = useState<string>('');

  const {
    monoRepoPath,
    selectedFolder,
    getLibsPath,
    getAppsPath,
    setSelectedFolder
  } = useGitHistoryStore();
  const { currentView, folders, setFolders } = useAppStore();

  const loadFolders = async () => {
    const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
    try {
      const result = await invoke<string[]>('list_folders', { path: basePath });
      setFolders(result.map(name => ({
        name,
        isTypeScript: false,
        isLoading: false,
        isSelected: false
      })));
      setError('');
    } catch (error: Error | any) {
      console.error('Failed to load folders:', error);
      setError(`Failed to load folders: ${error.message || error}`);
      setFolders([]);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [currentView, monoRepoPath]);

  const handleFolderClick = async (folder: any) => {
    setLoading(true);
    setCommits([]);
    setSelectedFolder(folder.name);

    const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
    const fullPath = `${basePath}/${folder.name}`;
    setCurrentRepoPath(fullPath); // Store the current repo path

    try {
      const commits = await invoke<BasicCommit[]>('list_folder_commits', {
        path: fullPath,
        limit: 50
      });
      setCommits(commits);
      setError('');
    } catch (error: Error | any) {
      console.error('Failed to load commits:', error);
      setError(`Failed to load commits: ${error.message || error}`);
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
    } catch (error: Error | any) {
      console.error('Failed to load commit details:', error);
      setError(`Failed to load commit details: ${error.message || error}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-8rem)]">
        <div className="border rounded-lg overflow-scroll max-h-[calc(100vh-136px)]">
          <FolderList
            folders={folders}
            onClick={handleFolderClick}
            icon={TimerReset}
          />
        </div>

        <div className="border rounded-lg p-4 col-span-3 overflow-scroll max-h-[calc(100vh-136px)]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading commits...
                </span>
              </div>
            </div>
          ) : commits.length > 0 ? (
            <CommitList
              commits={commits}
              onCommitClick={handleCommitClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <GitCommitIcon className="w-8 h-8 mb-2" />
              <p>{selectedFolder ? 'No commits found' : 'Select a folder to view commits'}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[90vw] h-[90vh] p-6 block">
          <DialogHeader>
            <DialogTitle>Commit Details</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : selectedCommit ? (
            <div className="h-[calc(90vh-8rem)]">
              <CommitDetails
                commit={selectedCommit}
                repoPath={currentRepoPath}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GitHistory;
