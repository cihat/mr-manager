import { useEffect, useState } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import useStore from "@/store";

export const useFolderLoader = () => {
  const { monoRepoPath, currentView, getLibsPath, getAppsPath, setFolders } = useStore();
  const [_folders, _setFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadFolders = async () => {
      if (!monoRepoPath) return;

      const basePath = currentView === "libs"
        ? getLibsPath(monoRepoPath)
        : getAppsPath(monoRepoPath);

      try {
        const entries = await readDir(basePath);
        const tsProjectNames = new Set<string>();

        for (const folder of entries) {
          try {
            const files = await readDir(`${basePath}/${folder.name}`);
            if (files.some(f => f.name === 'tsconfig.json')) {
              tsProjectNames.add(folder.name);
            }
          } catch (error) {
            console.error(`Error processing ${folder.name}:`, error);
          }
        }

        _setFolders(tsProjectNames);
        setFolders(entries as any);
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    };

    loadFolders();
  }, [monoRepoPath, currentView, getLibsPath, getAppsPath, setFolders]);

  return { _folders };
};
