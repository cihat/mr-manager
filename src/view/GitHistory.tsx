import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FolderList from "@/components/folder-list";
import useStore from "@/store/gitHistory";
import { Loader2, GitCommit as GitCommitIcon, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BasicCommit {
  id: string;
  message: string;
  author: string;
  date: number;
}

interface GitChange {
  status: string;
  file: string;
}

interface DetailedCommit extends BasicCommit {
  changes: GitChange[];
}

interface CommitDetailsProps {
  commit: DetailedCommit
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Added':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'Deleted':
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    case 'Modified':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  }
};

const CommitDetails: React.FC<CommitDetailsProps> = ({ commit }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2 pb-4 border-b">
        <h3 className="font-medium text-lg">{commit.message}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitCommitIcon className="w-4 h-4" />
          <span>{commit.id.slice(0, 7)}</span>
          <span>•</span>
          <span>{commit.author}</span>
          <span>•</span>
          <span>{new Date(commit.date * 1000).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-medium mb-3">Changes ({commit.changes.length})</h4>
        {commit.changes.map((change, idx) => (
          <div key={idx} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/50">
            <Badge variant="outline" className={cn("font-medium", getStatusColor(change.status))}>
              {change.status}
            </Badge>
            <div className="flex items-center gap-2 text-sm truncate">
              <FileIcon className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{change.file}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CommitList: React.FC<{
  commits: BasicCommit[];
  onCommitClick: (commit: BasicCommit) => void;
}> = ({ commits, onCommitClick }) => {
  if (!commits.length) return null;

  return (
    <div className="space-y-2">
      {commits.map((commit) => (
        <div
          key={commit.id}
          className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => onCommitClick(commit)}
        >
          <div className="flex items-start gap-3">
            <GitCommitIcon className="w-5 h-5 mt-1 text-muted-foreground" />
            <div>
              <div className="font-medium">{commit.message}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{commit.id.slice(0, 7)}</span>
                <span>•</span>
                <span>{commit.author}</span>
                <span>•</span>
                <span>{new Date(commit.date * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GitHistory: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [folders, setFolders] = useState<Array<any>>([]);
  const [commits, setCommits] = useState<BasicCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<DetailedCommit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const {
    monoRepoPath,
    currentView,
    getLibsPath,
    getAppsPath,
    setCurrentView
  } = useStore();

  useEffect(() => {
    loadFolders();
  }, [currentView, monoRepoPath]);

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

  const handleFolderClick = async (folder: any) => {
    setLoading(true);
    setCommits([]);
    setSelectedFolder(folder.name);
    try {
      const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
      const fullPath = `${basePath}/${folder.name}`;
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
    if (!selectedFolder) return;

    setDetailsLoading(true);
    try {
      const basePath = currentView === "libs" ? getLibsPath(monoRepoPath) : getAppsPath(monoRepoPath);
      const fullPath = `${basePath}/${selectedFolder}`;
      const details = await invoke<DetailedCommit>('get_commit_details', {
        repoPath: fullPath,
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
      <ToggleGroup
        type="single"
        value={currentView}
        onValueChange={(value: 'libs' | 'apps') => value && setCurrentView(value)}
      >
        <ToggleGroupItem value="libs" className="w-24">Libs</ToggleGroupItem>
        <ToggleGroupItem value="apps" className="w-24">Apps</ToggleGroupItem>
      </ToggleGroup>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg overflow-scroll max-h-[calc(100vh-136px)]">
          <FolderList
            folders={folders}
            onClick={handleFolderClick}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commit Details</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : selectedCommit ? (
            <CommitDetails commit={selectedCommit} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GitHistory;
