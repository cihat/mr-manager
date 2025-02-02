import { BasicCommit } from "@/types";
import { GitCommitIcon } from "lucide-react";

const CommitList: React.FC<{
  commits: BasicCommit[];
  onCommitClick: (commit: BasicCommit) => void;
}> = ({ commits, onCommitClick }) => {
  if (!commits?.length) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

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
                <span>{formatDate(commit.date)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommitList;
