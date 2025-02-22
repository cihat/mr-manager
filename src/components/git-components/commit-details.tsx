import { Badge } from "@/components/ui/badge";
import { invoke } from '@tauri-apps/api/core';
import { cn } from "@/lib/utils";
import { Loader2, GitCommit as GitCommitIcon, FileIcon, Github, Copy, ChevronRight } from "lucide-react";
import { getCommitUrl } from '@/utils/git';
import DiffViewer from '@/components/git-components/diff-viewer';
import { useEffect, useState } from "react";
import { DetailedCommit } from "@/types";
import { Tooltip, TooltipContent } from "../ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";

interface CommitDetailsProps {
  commit: DetailedCommit;
  repoPath: string;
  onNextCommit?: () => void;
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

const CommitDetails: React.FC<CommitDetailsProps> = ({ commit, repoPath, onNextCommit }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<{ old: string; new: string } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

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

  const handleCopyPath = async (path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  useEffect(() => {
    if (commit.changes.length > 0) {
      handleFileClick(commit.changes[0].file);
    }
  }, [commit]);

  return (
    <div className="space-y-4 h-full">
      <div className="space-y-2 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg">{commit.message}</h3>
          {onNextCommit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNextCommit}
              className="ml-auto flex items-center gap-2"
            >
              Next Commit
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitCommitIcon className="w-4 h-4" />
          <span>{commit.id.slice(0, 7)}</span>
          <span>•</span>
          <span>{commit.author}</span>
          <span>•</span>
          <span>{new Date(commit.date * 1000).toLocaleDateString()}</span>
          <a
            className="flex items-center gap-1 text-sm text-muted-foreground ml-auto"
            href={getCommitUrl(commit.remote_url, commit.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="w-4 h-4" />
            <span>Open in GitHub</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100%-5rem)]">
        <div className="col-span-1 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
          <h4 className="text-sm font-medium mb-3 sticky top-0 bg-background py-2">
            Changes ({commit.changes.length})
          </h4>
          {commit.changes.map((change, idx) => (
            <Tooltip key={idx}>
              <TooltipTrigger>
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedFile === change.file && "bg-muted"
                  )}
                  onClick={() => handleFileClick(change.file)}
                >
                  <div className="flex">
                    <Badge variant="outline" className={cn("font-medium w-fit", getStatusColor(change.status))}>
                      {change.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleCopyPath(change.file, e)}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {copiedPath === change.file ? 'Copied!' : 'Copy path'}
                        </TooltipContent>
                      </Tooltip>
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm group">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{change.file}</span>
                      </div>

                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={1}>{change.file}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="col-span-4">
          {loadingDiff ? (
            <div className="flex justify-center items-center h-[800px]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : diffContent && selectedFile ? (
            <DiffViewer
              oldContent={diffContent.old}
              newContent={diffContent.new}
              language={getFileLanguage(selectedFile)}
            />
          ) : (
            <div className="flex justify-center items-center h-[800px] text-muted-foreground">
              Select a file to view changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommitDetails;
