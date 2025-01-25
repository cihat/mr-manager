//@ts-nocheck
import { useState, useEffect } from 'react';
import { readDir } from "@tauri-apps/plugin-fs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileText, Type, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useStore from '../store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/hooks/use-toast';

const FolderList = () => {
  const [folders, setFolders] = useState([]);
  const [tsProjects, setTsProjects] = useState(new Set());
  const [loadingFolder, setLoadingFolder] = useState('');
  const { monoRepoPath, selectedFolder, setError, setSelectedFolder } = useStore();

  useEffect(() => {
    const loadFolders = async () => {
      if (!monoRepoPath) return;
      try {
        const entries = await readDir(monoRepoPath, { recursive: false });
        const tsProjectNames = new Set();
        for (const folder of entries) {
          const libPath = `${monoRepoPath}/${folder.name}`;
          try {
            const files = await readDir(libPath, { recursive: false });
            if (files.some(f => f.name === 'tsconfig.json')) {
              tsProjectNames.add(folder.name);
            }
          } catch (err) {
            console.error(`Failed to read ${folder.name}:`, err);
          }
        }
        setTsProjects(tsProjectNames);
        setFolders(entries.filter(entry => entry.isDirectory));
      } catch (err) {
        console.error('Failed to read directory:', err);
        setFolders([]);
      }
    };
    loadFolders();
  }, [monoRepoPath]);

  if (!monoRepoPath || folders.length === 0) {
    return (
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
    );
  }

  return (
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-72 bg-gray-50 border-r">
      <ScrollArea className="p-2">
        {folders.map((folder) => (
          <div
            key={folder.name}
            className="mb-2"
            onClick={() => setSelectedFolder(folder.name)}
          >
            <div className={`flex items-center justify-between gap-2 w-full p-2 hover:bg-gray-100 rounded-lg ${selectedFolder === folder.name ? 'bg-gray-200' : ''}`}>
              <div className="flex">
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
                  className="text-blue-400 min-w-6 min-h-6 bg-blue-200 p-1 box-content rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    generateDocsForFolder(folder);
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
};

export default FolderList;
