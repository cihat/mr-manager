import { useMemo } from 'react';
import { FileText, Library } from "lucide-react";
import useStore from '../store';
import FolderList from './folder-list';
import { useFolderLoader } from '@/hooks/useFolderLoader';
import { useDocGenerator } from '@/hooks/useDocGenerator';

interface Folder {
  name: string;
  [key: string]: any;
}

interface EnrichedFolder extends Folder {
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

const Header = () => (
  <div className="flex items-center pl-3 pt-2 pb-0 bg-background">
    <Library className="w-8 h-8" />
    <h3 className="font-semibold text-2xl">Docs</h3>
  </div>
);

const TypeDocGeneration = () => {
  const { folders, selectedFolder } = useStore();
  const { _folders } = useFolderLoader();
  const { generateDocs, loadingFolder } = useDocGenerator();

  const enrichedFolders = useMemo<EnrichedFolder[]>(() => {
    return (folders || []).map(folder => ({
      ...folder,
      isTypeScript: _folders.has(folder.name),
      isLoading: loadingFolder === folder.name,
      isSelected: selectedFolder === folder.name
    }));
  }, [folders, _folders, loadingFolder, selectedFolder]);

  return (
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-[330px] bg-gray-50">
      <Header />

      <FolderList
        folders={enrichedFolders}
        onClick={(folder) => useStore.setState({ selectedFolder: folder.name })}
        handleGenerateDoc={generateDocs}
        icon={FileText}
      />
    </div>
  );
};

export default TypeDocGeneration;
