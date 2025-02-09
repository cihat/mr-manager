import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useStore from "@/store";
import { readDir } from "@tauri-apps/plugin-fs";

const FolderSelect = () => {
  const {
    currentView,
    setCurrentView,
    packageFolders,
    setPackageFolders,
    monoRepoPath
  } = useStore();

  useEffect(() => {
    const fetchPackageFolders = async () => {
      if (!monoRepoPath) return;
      try {
        // Get all entries in the packages directory
        const packagesPath = `${monoRepoPath}/packages`;
        const entries = await readDir(packagesPath);
        // Filter only directories and get their names
        const folders = entries
          .filter(entry => entry.isDirectory && !entry.isFile && !entry.isSymlink)
          .map(entry => entry.name ?? '')
          .filter(Boolean);
        
        setPackageFolders(folders);
        // Set the first folder as default view if none selected
        if (!currentView && folders.length > 0) {
          setCurrentView(folders[0]);
        }
      } catch (error) {
        console.error('Error fetching package folders:', error);
      }
    };

    fetchPackageFolders();
  }, [monoRepoPath]);

  if (packageFolders.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentView}
      onValueChange={setCurrentView}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a folder" />
      </SelectTrigger>
      <SelectContent>
        {packageFolders.map((folder) => (
          <SelectItem
            key={folder}
            value={folder}
          >
            {folder}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default FolderSelect;
