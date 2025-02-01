import { useMemo } from 'react';
import { FileText } from "lucide-react";
import useStore from '../store';
import FolderList from './folder-list';
import { useFolderLoader } from '@/hooks/useFolderLoader';
import { useDocGenerator } from '@/hooks/useDocGenerator';
import SubHeader from './sub-header';

interface Folder {
  name: string;
  [key: string]: any;
}

interface EnrichedFolder extends Folder {
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

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
    <div className="max-h-[calc(100vh-64px)] cursor-pointer overflow-scroll min-w-[330px]">
      <SubHeader title="Docs" icon="library" />
      <FolderList
        folders={enrichedFolders}
        onClick={(folder) => useStore.setState({ selectedFolder: folder.name })}
        handleGenerateDoc={generateDocs}
        icon={FileText}
        selectedFolder={selectedFolder}
      />
    </div>
  );
};

export default TypeDocGeneration;
