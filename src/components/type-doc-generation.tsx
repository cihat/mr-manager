import { useState, useEffect } from 'react';
import { readDir } from "@tauri-apps/plugin-fs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder } from "lucide-react";
import useStore from '../store';

const FolderList = () => {
  const [folders, setFolders] = useState([]);
  const monoRepoPath = useStore(state => state.monoRepoPath);

  useEffect(() => {
    const loadFolders = async () => {
      if (!monoRepoPath) return;
      try {
        const entries = await readDir(monoRepoPath, { recursive: false });
        setFolders(entries);
      } catch (err) {
        console.error('Failed to read directory:', err);
      }
    };
    loadFolders();
  }, [monoRepoPath]);

  const handleFolderClick = (folder) => {
    console.log('Folder clicked:', folder);
  }

  return (
    <div className="max-h-[calc(100vh-64px)] overflow-scroll w-64 bg-gray-50 border-r">
      <ScrollArea>
        {folders.map((folder) => (
          <div key={folder.name} className="mb-2 cursor-pointer" onClick={() => handleFolderClick(folder)}>
            <div className="flex items-center gap-2 w-full p-2 hover:bg-gray-100 rounded-lg">
              <Folder className="w-5 h-5 text-blue-500" />
              <span className="text-sm">{folder.name}</span>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default FolderList;
