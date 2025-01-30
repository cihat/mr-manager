import { Badge } from "@/components/ui/badge";
import { invoke } from '@tauri-apps/api/core';
import { cn } from "@/lib/utils";
import { Loader2, GitCommit as GitCommitIcon, FileIcon, Github } from "lucide-react";
import { getCommitUrl } from '@/utils/git';
import DiffViewer from '@/components/git-components/diff-viewer';
import { useState } from "react";
import { DetailedCommit } from "@/types";


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
      <div className="space-y-2 pb-4">
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
