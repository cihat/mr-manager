import { useState, useEffect, ReactNode } from 'react';
import { DirEntry, readDir } from "@tauri-apps/plugin-fs";
import { Library } from "lucide-react";
import useStore from '../store';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/hooks/use-toast';
import FolderList from './folder-list';

interface FolderContainerProps {
  children?: ReactNode;
}

const TypeDocGeneration = ({ children }: FolderContainerProps) => {
  const [folders, setFolders] = useState<DirEntry[]>([]);
  const [tsProjects, setTsProjects] = useState(new Set());
  const [loadingFolder, setLoadingFolder] = useState('');
  const {
    monoRepoPath,
    selectedFolder,
    getLibsPath,
    setError,
    setSelectedFolder,
    setCurrentGeneratedFolder
  } = useStore();

  const { toast } = useToast();

  useEffect(() => {
    const loadFolders = async () => {
      if (!monoRepoPath) return;

      const libsPath = getLibsPath(monoRepoPath);
      try {
        const entries = await readDir(libsPath);
        const tsProjectNames = new Set();
        for (const folder of entries) {
          const libPath = `${libsPath}/${folder.name}`;
          try {
            const files = await readDir(libPath);
            if (files.some(f => f.name === 'tsconfig.json')) {
              tsProjectNames.add(folder.name);
            }
          } catch (err) {
            console.error(`Failed to read ${folder.name}:`, err);
          }
        }
        setTsProjects(tsProjectNames);
        setFolders(entries);
      } catch (err) {
        console.error('Failed to read directory:', err);
      }
    };
    loadFolders();
  }, [monoRepoPath]);

  const generateDocsForFolder = async (folder: any) => {
    try {
      setLoadingFolder(folder.name);
      const libPath = `${getLibsPath(monoRepoPath)}/${folder.name}`;
      const result = await invoke('generate_docs', { path: libPath });
      setCurrentGeneratedFolder(folder.name);
      toast({
        title: `Documentation Generated: ${result}`,
        description: `Documentation generated for ${folder.name}`,
      });
      setError('');
    } catch (error) {
      toast({
        title: 'Failed to generate documentation',
        description: `Failed to generate documentation for ${folder.name}`,
        variant: 'destructive'
      })
      setError('Failed to generate documentation');
    } finally {
      setLoadingFolder('');
      setSelectedFolder(folder.name);
    }
  }

  const enrichedFolders = folders?.map(folder => ({
    ...folder,
    isTypeScript: tsProjects.has(folder.name),
    isLoading: loadingFolder === folder.name,
    isSelected: selectedFolder === folder.name
  }));

  return (
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-72 bg-gray-50 ">
      <div className="flex items-center pl-3 pt-2 pb-0 bg-background">
        <Library className='w-8 h-8' />
        <h3 className='font-semibold text-2xl'>Libs</h3>
      </div>

      <FolderList
        folders={enrichedFolders}
        onClick={folder => {
          setSelectedFolder(folder.name);
        }}
        handleGenerateDoc={folder => {
          if (!folder.isLoading) {
            generateDocsForFolder(folder);
          }
        }}
      >
        {children}
      </FolderList>
    </div>
  );
};

export default TypeDocGeneration;
