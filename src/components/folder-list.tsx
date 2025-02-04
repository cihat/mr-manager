import React, { ReactNode } from 'react';
import { Folder, Type, Loader2, LucideIcon, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const FolderList: React.FC<FolderListProps> = ({
  folders = [],
  onClick,
  handleGenerateDoc,
  children,
  icon: Icon,
  selectedFolder,
  className
}) => {
  const { searchQuery, toggleFavorite } = useStore();

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!folders?.length) {
    return (
      <div className="p-4 bg-background h-full">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No Folders Found</CardTitle>
            <CardDescription>
              Select a monorepo directory to view its folders
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Folder className="w-12 h-12 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (filteredFolders.length === 0) {
    return (
      <div className="p-4 bg-background h-full">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No Matches Found</CardTitle>
            <CardDescription>
              No folders match your search query: "{searchQuery}"
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Folder className="w-12 h-12 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort folders with favorites first
  const sortedFolders = [...filteredFolders].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  return (
    <ScrollArea className={`p-2 bg-background ${className}`}>
      {sortedFolders.map((folder) => (
        <div
          key={folder.name}
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
      ))}
    </ScrollArea>
  );
};

export default FolderList;
