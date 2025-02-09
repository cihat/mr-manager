import { useState } from "react";
import { useToast } from "./use-toast";
import useStore, { Folder } from "@/store";
import { invoke } from '@tauri-apps/api/core';

export const useDocGenerator = () => {
  const { monoRepoPath, getPackagePath, setCurrentGeneratedFolder, setError, setSelectedFolder } = useStore();
  const { toast } = useToast();
  const [loadingFolder, setLoadingFolder] = useState('');

  const generateDocs = async (folder: Folder) => {
    try {
      setLoadingFolder(folder.name);
      const basePath = getPackagePath(monoRepoPath);

      const result = await invoke('generate_docs', {
        path: `${basePath}/${folder.name}`
      });

      setCurrentGeneratedFolder(folder.name);
      toast({
        title: `Documentation Generated: ${result}`,
        description: `Generated for ${folder.name}`,
      });
      setError('');
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: `Failed to generate docs for ${folder.name}`,
        variant: 'destructive'
      });
      setError('Generation failed');
    } finally {
      setLoadingFolder('');
      setSelectedFolder(folder.name);
    }
  };

  return { generateDocs, loadingFolder };
};
