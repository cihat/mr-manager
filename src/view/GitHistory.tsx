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
import { Loader2, GitCommit as GitCommitIcon, FileIcon, Github, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DiffEditor } from '@monaco-editor/react';
import { getCommitUrl } from '@/utils/git';

interface BasicCommit {
  id: string;
  message: string;
  author: string;
  date: number;
  remote_url: string;
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
  repoPath: string;
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

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  language?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldContent, newContent, language = "typescript" }) => {
  return (
    <div className="h-full w-full border rounded-md overflow-hidden">
      <DiffEditor
        height="100%"
        width="100%"
        language={language}
        original={oldContent}
        modified={newContent}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          diffWordWrap: "off",
          renderOverviewRuler: false,
        }}
        theme="vs-dark"
      />
    </div>
  );
};

const CommitDetails: React.FC<CommitDetailsProps> = ({ commit, repoPath }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<{ old: string; new: string } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const getFileLanguage = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      case 'php':
        return 'php';
      case 'rs':
        return 'rust';
      default:
        return 'plaintext';
    }
  };

  const handleFileClick = async (file: string) => {
    setLoadingDiff(true);
    setSelectedFile(file);
    try {
      const [oldContent, newContent] = await invoke<[string, string]>('get_commit_diff', {
        repoPath,
        commitId: commit.id,
        filePath: file,
      });
      setDiffContent({ old: oldContent, new: newContent });
    } catch (error) {
      console.error('Failed to load diff:', error);
    } finally {
      setLoadingDiff(false);
    }
  };


  return (
    <div className="space-y-4 h-full">
      <div className="space-y-2 pb-4 border-b">
        <h3 className="font-medium text-lg">{commit.message}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitCommitIcon className="w-4 h-4" />
          <span>{commit.id.slice(0, 7)}</span>
          <span>•</span>
          <span>{commit.author}</span>
          <span>•</span>
          <span>{new Date(commit.date * 1000).toLocaleDateString()}</span>
          <a
            className='flex items-center gap-1 text-sm text-muted-foreground ml-auto'
            href={getCommitUrl(commit.remote_url, commit.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* <ExternalLink className="w-4 h-4" /> */}
            <Github className="w-4 h-4" />
            <span>Open in GitHub</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100%-5rem)]">
        <div className="col-span-1 space-y-2 overflow-y-auto pr-2">
          <h4 className="text-sm font-medium mb-3 sticky top-0 bg-background py-2">
            Changes ({commit.changes.length})
          </h4>
          {commit.changes.map((change, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                selectedFile === change.file && "bg-muted"
              )}
              onClick={() => handleFileClick(change.file)}
            >
              <Badge variant="outline" className={cn("font-medium w-fit", getStatusColor(change.status))}>
                {change.status}
              </Badge>
              <div className="flex items-center gap-2 text-sm">
                <FileIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate text-xs">{change.file}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-4">
          {loadingDiff ? (
            <div className="flex justify-center items-center h-[800px] border rounded-md">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : diffContent && selectedFile ? (
            <DiffViewer
              oldContent={diffContent.old}
              newContent={diffContent.new}
              language={getFileLanguage(selectedFile)}
            />
          ) : (
            <div className="flex justify-center items-center h-[800px] text-muted-foreground border rounded-md">
              Select a file to view changes
            </div>
          )}
        </div>
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
  const [currentRepoPath, setCurrentRepoPath] = useState<string>(''); // Added to track current repo path

  const {
    monoRepoPath,
    getLibsPath,
    getAppsPath,
  } = useGitHistoryStore();
  const { currentView } = useAppStore();

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
