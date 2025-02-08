import { useState, useMemo } from 'react';
import { Bell, Settings2, FolderGit2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Fuse from 'fuse.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationSettings } from '@/store';
import useStore from "@/store";
import { ToggleGroup, ToggleGroupItem } from '@radix-ui/react-toggle-group';
import CommitMonitor from './commit-monitor';
import FolderToggle from '../folder-toggle';

interface NotificationSettingsProps {
  folders?: { name: string }[];
  onSettingsChange?: (settings: NotificationSettings) => void;
  defaultInterval?: number;
  defaultEnabledFolders?: string[];
}

const NotificationSettings = ({
  folders = [],
}: NotificationSettingsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const { currentView, setCurrentView, updateNotificationSettings, notificationSettings } = useStore();
  const { monitoredFolders, checkInterval, isEnabled } = notificationSettings;

  const fuse = useMemo(() => new Fuse(folders, {
    keys: ['name'],
    threshold: 0.3,
    shouldSort: true
  }), [folders]);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, folders, fuse]);

  // Interval presets for dropdown
  const intervalPresets = [
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '120', label: '2 hours' },
    { value: '240', label: '4 hours' },
    { value: '480', label: '8 hours' },
    { value: '1440', label: '1 day' },
  ];

  const handleFolderToggle = (folderName: string) => {
    updateNotificationSettings({
      isEnabled,
      checkInterval,
      monitoredFolders: monitoredFolders.includes(folderName)
        ? monitoredFolders.filter(name => name !== folderName)
        : [...monitoredFolders, folderName]
    })
  };

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (interval < 1) {
      setError('Interval must be at least 1 minute');
      return;
    }
    setError('');
    updateNotificationSettings({
      isEnabled,
      checkInterval: interval,
      monitoredFolders
    })
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="ml-2">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl" aria-describedby='notification-settings' aria-description='Notification settings dialog'>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Commit Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Status</CardTitle>
              <CardDescription>Enable or disable commit notifications</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Label htmlFor="notifications-enabled">Enable Notifications</Label>
              <Switch
                id="notifications-enabled"
                checked={isEnabled}
                onCheckedChange={() => updateNotificationSettings({
                  isEnabled: !isEnabled,
                  checkInterval,
                  monitoredFolders
                })}
              />
            </CardContent>
          </Card>

          {/* Check interval settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Check Interval</CardTitle>
              <CardDescription>How often to check for new commits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Select
                  value={checkInterval.toString()}
                  onValueChange={handleIntervalChange}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {intervalPresets.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={checkInterval}
                    onChange={(e) => handleIntervalChange(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Folder selection */}
          <Card>
            <CardHeader>
              <div className='flex justify-between w-full'>
                <div>
                  <CardTitle className="text-lg">Monitored Folders</CardTitle>
                  <CardDescription>Select folders to monitor for new commits</CardDescription>
                </div>
                {/* <ToggleGroup
                  type="single"
                  value={currentView}
                  onValueChange={(value: 'libs' | 'apps') => value && setCurrentView(value)}
                >
                  <ToggleGroupItem value="libs" className="w-24">Libs</ToggleGroupItem>
                  <ToggleGroupItem value="apps" className="w-24">Apps</ToggleGroupItem>
                </ToggleGroup> */}
                <FolderToggle />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-4 space-y-2">
                  {filteredFolders.map(folder => (
                    <div key={folder.name} className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg">
                      <Switch
                        id={`folder-${folder.name}`}
                        checked={monitoredFolders.includes(folder.name)}
                        onCheckedChange={() => handleFolderToggle(folder.name)}
                      />
                      <Label htmlFor={`folder-${folder.name}`} className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4" />
                        {folder.name}
                      </Label>
                    </div>
                  ))}
                  {filteredFolders.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No folders found matching your search
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      <CommitMonitor />
    </Dialog>
  );
};

export default NotificationSettings;
