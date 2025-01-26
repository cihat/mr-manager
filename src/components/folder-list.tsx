import React, { ReactNode } from 'react';
import { Folder, FileText, Type, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface FolderItem {
  name: string;
  isTypeScript: boolean;
  isLoading: boolean;
  isSelected: boolean;
}

interface FolderListProps {
  folders?: FolderItem[];
  onClick?: (folder: FolderItem) => void;
  children?: ReactNode;
  handleGenerateDoc?: (folder: FolderItem) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders = [], onClick, handleGenerateDoc, children }) => {
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

  return (
    <ScrollArea className="p-2 bg-background">
      {folders.map((folder) => (
        <div
          key={folder.name}
          className="mb-2 border border-transparent"
          onClick={() => onClick?.(folder)}
        >
          <div className={`flex items-center justify-between gap-2 w-full p-2 hover:bg-muted rounded-lg ${folder.isSelected ? 'bg-accent' : ''
            }`}>
            <div className="flex">
              <Folder className="w-5 h-5 text-primary" />
              <span className="text-sm ml-2">{folder.name}</span>
              {folder.isTypeScript && (
                <Type className="w-4 h-4 ml-2 text-primary" />
              )}
            </div>
            {folder.isLoading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <FileText
                className="text-primary min-w-[24px] min-h-[24px] bg-accent p-1 box-content rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateDoc?.(folder);
                }}
              />
            )}
          </div>
          {folder.isSelected && children}
        </div>
      ))}
    </ScrollArea>
  );
};

export default FolderList;
