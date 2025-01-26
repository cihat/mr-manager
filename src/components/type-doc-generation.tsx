//@ts-nocheck
import { useState, useEffect } from 'react';
import { readDir } from "@tauri-apps/plugin-fs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileText, Type, Loader2, Library } from "lucide-react";
import useStore from '../store';
import { invoke } from '@tauri-apps/api/core';
// import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useToast } from '@/hooks/use-toast';

const FolderList = () => {
  const [folders, setFolders] = useState(null);
  const [tsProjects, setTsProjects] = useState(new Set());
  const [loadingFolder, setLoadingFolder] = useState('');
  const { monoRepoPath, selectedFolder, getLibsPath, setError, setSelectedFolder, setCurrentGeneratedFolder } = useStore();

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

  return (
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-72 bg-gray-50 border-r">
      <div className="flex items-center pl-3 pt-2 pb-0">
        <Library className='w-8 h-8' />
        <h3 className='font-semibold text-2xl'>Libs</h3>
      </div>

      <ScrollArea className='p-2'>
        {folders?.length > 0 ? folders.map((folder) => (
          <div
            key={folder.name}
            className="mb-2"
            onClick={() => setSelectedFolder(folder.name)}
          >
            <div className={`flex items-center justify-between gap-2 w-full p-2 hover:bg-gray-100 rounded-lg ${selectedFolder === folder.name ? 'bg-gray-200' : ''}`}>
              <div className='flex'>
                <Folder className="w-5 h-5 text-purple-500" />
                <span className="text-sm ml-2">{folder.name}</span>
                {tsProjects.has(folder.name) && (
                  <Type className="w-4 h-4 ml-2 text-blue-500" />
                )}
              </div>
              {loadingFolder === folder.name ? (
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              ) : (
                <FileText
                  className='text-blue-400 min-w-[24px] min-h-[24px] bg-blue-200 p-1 box-content rounded-lg'
                  onClick={(e) => {
                    e.stopPropagation();
                    generateDocsForFolder(folder);
                  }}
                />
              )}
            </div>
          </div>
        )) : (
          <div className="p-4">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">No Folders Found</CardTitle>
                <CardDescription>
                  Select a monorepo directory to view its folders
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Folder className="w-12 h-12 text-gray-400" />
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default FolderList
