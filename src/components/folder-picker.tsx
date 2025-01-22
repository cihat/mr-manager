import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { FolderPlus } from "lucide-react";

const FolderPicker = () => {
  const [selectedPath, setSelectedPath] = useState('');
  const [error, setError] = useState('');

  const handleFolderSelect = (event) => {
    const fileInput = event.target;
    if (fileInput.files && fileInput.files[0]) {
      const folderPath = fileInput.files[0].webkitRelativePath;
      const folderName = folderPath.split('/')[0];
      setSelectedPath(folderName);
      setError('');
    } else {
      setError('Please select a folder');
    }
  };

  return (
    <div className="relative ml-auto cursor-pointer ">
      <Input
        id="folder"
        type="file"
        webkitdirectory="true"
        directory="true"
        onChange={handleFolderSelect}
        className="opacity-0 absolute inset-0"
      />
      <div className="flex items-center gap-2 p-2 rounded-md border">
        <FolderPlus className="w-5 h-5" />
        <span className="text-sm text-muted-foreground">
          {selectedPath || 'Choose mono repo folder'}
        </span>
      </div>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};

export default FolderPicker;
