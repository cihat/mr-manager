import React, { ReactNode, useCallback, useRef, useState, useEffect } from 'react';
import { Folder, Type, Loader2, LucideIcon, Star } from "lucide-react";
import { VariableSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import useStore from '@/store';

interface FolderItem {
  name: string;
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
  isFavorite?: boolean;
}

interface FolderListProps {
  folders?: FolderItem[];
  onClick?: (folder: FolderItem) => void;
  children?: ReactNode;
  handleGenerateDoc?: (folder: FolderItem) => void;
  icon: LucideIcon;
  selectedFolder: any;
  className?: string;
}

interface RowData {
  folders: FolderItem[];
  selectedFolder: string;
  onClick: (folder: FolderItem) => void;
  handleGenerateDoc: (folder: FolderItem) => void;
  toggleFavorite: (name: string) => void;
  Icon: LucideIcon;
  children: ReactNode;
  setSize: (index: number, size: number) => void;
}

const FolderRow = React.memo(({ data, index, style }: { 
  data: RowData; 
  index: number; 
  style: React.CSSProperties 
}) => {
  const { 
    folders, 
    selectedFolder, 
    onClick, 
    handleGenerateDoc, 
    toggleFavorite, 
    Icon,
    children,
    setSize 
  } = data;
  
  const folder = folders[index];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current) {
      const size = rowRef.current.getBoundingClientRect().height;
      if (size > 0) {
        setSize(index, size);
      }
    }
  }, [folder.isSelected, setSize, index]);

  return (
    <div style={style}>
      <div
        ref={rowRef}
        className="mb-2 border border-transparent cursor-pointer"
        onClick={() => onClick?.(folder)}
      >
        <div className={`flex items-center justify-between gap-2 w-full p-2 hover:bg-muted rounded-lg ${
          folder.name === selectedFolder ? 'bg-accent' : ''
        }`}>
          <div className="flex items-center">
            <Folder className="w-5 h-5 text-primary" />
            <span className="text-sm ml-2">{folder.name}</span>
            {folder.isTypeScript && (
              <Type className="w-4 h-4 ml-2 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {folder.isLoading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <Star
                  className={`w-6 h-6 cursor-pointer ${
                    folder.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(folder.name);
                  }}
                />
                <Icon
                  className="text-primary min-w-[24px] min-h-[24px] bg-accent p-1 box-content rounded-lg hover:bg-accent/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateDoc?.(folder);
                  }}
                />
              </>
            )}
          </div>
        </div>
        {folder.isSelected && children}
      </div>
    </div>
  );
});

FolderRow.displayName = 'FolderRow';

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="p-4 bg-background h-full">
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Folder className="w-12 h-12 text-muted-foreground" />
      </CardContent>
    </Card>
  </div>
);

const FolderList: React.FC<FolderListProps> = ({
  folders = [],
  onClick = () => {},
  handleGenerateDoc = () => {},
  children,
  icon: Icon,
  selectedFolder,
  className
}) => {
  const { searchQuery, toggleFavorite } = useStore();
  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [key: number]: number }>({});
  const [listHeight, setListHeight] = useState(() => window.innerHeight - 116);

  useEffect(() => {
    const handleResize = () => {
      setListHeight(window.innerHeight - 116);
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSize = useCallback((index: number) => {
    return sizeMap.current[index] || 50;
  }, []);

  const setSize = useCallback((index: number, size: number) => {
    const prevSize = sizeMap.current[index];
    if (prevSize !== size) {
      sizeMap.current[index] = size;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle empty states
  if (!folders?.length) {
    return (
      <EmptyState 
        title="No Folders Found"
        description="Select a monorepo directory to view its folders"
      />
    );
  }

  if (filteredFolders.length === 0) {
    return (
      <EmptyState 
        title="No Matches Found"
        description={`No folders match your search query: "${searchQuery}"`}
      />
    );
  }

  // Sort folders with favorites first
  const sortedFolders = [...filteredFolders].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  const itemData = {
    folders: sortedFolders,
    selectedFolder,
    onClick,
    handleGenerateDoc,
    toggleFavorite,
    Icon,
    children,
    setSize
  };

  return (
    <div className={`bg-background ${className}`}>
      <List
        ref={listRef}
        height={listHeight}
        itemCount={sortedFolders.length}
        itemSize={getSize}
        width="100%"
        itemData={itemData}
        className="scrollbar-hide"
        overscanCount={5}
      >
        {FolderRow}
      </List>
    </div>
  );
};

export default FolderList;
