import React, { useCallback } from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import FolderPicker from "@/components/folder-picker";
import useStore from "@/store";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { items } from './app-sidebar';
import { useLocation } from 'react-router';

export const Header: React.FC = () => {
  const {
    currentView,
    searchQuery,
    setCurrentView,
    setSearchQuery,
  } = useStore();
  const location = useLocation();

  const shouldShowFolderActions = items.find(item => item.url === location.pathname)?.hasFolderPicker;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      {shouldShowFolderActions &&
        <>
          <div className="relative mr-auto w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <ToggleGroup
            type="single"
            value={currentView}
            onValueChange={(value: 'libs' | 'apps') => value && setCurrentView(value)}
          >
            <ToggleGroupItem value="libs" className="">Libs</ToggleGroupItem>
            <ToggleGroupItem value="apps" className="">Apps</ToggleGroupItem>
          </ToggleGroup>
        </>
      }
      <FolderPicker />
    </header>
  );
};
