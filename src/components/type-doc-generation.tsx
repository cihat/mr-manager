// @ts-nocheck

import { useState, useEffect } from 'react';
import { readDir } from "@tauri-apps/plugin-fs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileText } from "lucide-react";
import useStore from '../store';
import { invoke } from '@tauri-apps/api/core';

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

  const generateDocsForFolder = async (folder) => {
    console.log('Folder clicked:', folder);
    // add exist tsconfig.json file
    let isTSProject = false;
    const libPath = `${monoRepoPath}/${folder.name}`
    const folders = await readDir(libPath, { recursive: false });

    folders.forEach((f) => {
      if (f.name === 'tsconfig.json') {
        isTSProject = true;
      }
    })
    console.log('libPath >>', libPath)

    invoke('generate_docs', { path: libPath });
  }

  const handleFolder = ({ name }) => {
    console.log('Folder clicked:', name);
    useStore.setState({ selectedFolder: name });
  }

  return (
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-72 bg-gray-50 border-r">
      <ScrollArea className='p-2'>
        {folders.map((folder) => (
          <div key={folder.name} className="mb-2" onClick={() => handleFolder(folder)}>
            <div className="flex items-center justify-between gap-2 w-full p-2 hover:bg-gray-100 rounded-lg">
              <div className='flex'>
                <Folder className="w-5 h-5 text-blue-500" />
                <span className="text-sm ml-2">{folder.name}</span>
              </div>
              <FileText className='text-green-500 min-w-[24px] min-h-[24px]' onClick={() => generateDocsForFolder(folder)} />
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default FolderList;
