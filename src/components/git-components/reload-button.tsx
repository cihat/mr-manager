// @ts-nocheck
import { RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { invoke } from '@tauri-apps/api/core';
import useGitHistory from '@/hooks/useGithubHistory';

interface ReloadButtonProps {
  path?: string;
  onReload?: () => Promise<void>;
  className?: string;
}

const ReloadButton = ({
  path,
  onReload,
  className = '',
}: ReloadButtonProps) => {
  const { loading, setLoading, commits, setCommits, currentRepoPath, selectedFolder, handleFolderClick } = useGitHistory();

  const handleReload = async () => {

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      await invoke('clear_git_cache', { path });

      // if (currentRepoPath && selectedFolder) {
      //   console.log('triggering handleFolderClick');

      //   await handleFolderClick({ name: selectedFolder });
      //   console.log('aliveli >>')
      // }
      console.log('commits >>', commits)
      if (commits.length > 0) {

        setCommits([]);
      }

      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Failed to reload:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReload}
          disabled={loading}
          className={className}
        >
          <Trash2
            className={`h-4 w-4 ${(loading) ? 'animate-spin' : ''}`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Refresh git history (clears cache)</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ReloadButton;
