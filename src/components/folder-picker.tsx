// FolderPicker.jsx
import { useState } from 'react';
import { FolderPlus } from "lucide-react";
import useStore from '../store';
import { open } from "@tauri-apps/plugin-dialog";

const FolderPicker = () => {
  const setMonoRepoPath = useStore(state => state.setMonoRepoPath);
  const monoRepoPath = useStore(state => state.monoRepoPath);
  const [error, setError] = useState('');


  const handleFolderSelect = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        // defaultPath: ""
      });

      if (selected) {
        console.log('selected >>', selected)
        
        setMonoRepoPath(selected);
        setError('');
      }
    } catch (err) {
      setError('Failed to select folder');
      console.error(err);
    }
  };

  return (
    <div
      className="relative ml-auto cursor-pointer"
      onClick={handleFolderSelect}
    >
      <div className="flex items-center gap-2 p-2 rounded-md border">
        <FolderPlus className="w-5 h-5" />
        <span className="text-sm text-muted-foreground">
          {monoRepoPath || 'Choose mono repo folder'}
        </span>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};

export default FolderPicker;
