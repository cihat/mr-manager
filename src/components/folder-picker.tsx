// FolderPicker.jsx
import { useState } from 'react';
import { FolderPlus } from "lucide-react";
import useStore from '../store';
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from './ui/button';

const FolderPicker = () => {
  const { monoRepoPath, setMonoRepoPath } = useStore();
  const [error, setError] = useState('');


  const handleFolderSelect = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected) {
        setMonoRepoPath(selected);
        setError('');
      }
    } catch (err) {
      setError('Failed to select folder');
      console.error(err);
    }
  };

  return (
    <Button
      variant={monoRepoPath ? 'secondary' : 'destructive'}
      // className="relative ml-auto cursor-pointer"
      className='ml-auto'
      onClick={handleFolderSelect}
    >
      <div className="flex items-center justify-center">
        <FolderPlus className="w-5 h-5 mr-2" />
        <span className="text-sm text-muted-foreground">
          {monoRepoPath || 'Choose mono repo folder'}
        </span>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </Button>
  );
};

export default FolderPicker;
