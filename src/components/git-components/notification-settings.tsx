//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Bell, Settings2, FolderGit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationSettings } from '@/store';

interface NotificationSettingsProps {
  folders?: { name: string }[];
  onSettingsChange?: (settings: NotificationSettings) => void;
  defaultInterval?: number;
  defaultEnabledFolders?: string[];
}

const NotificationSettings = ({
  folders = [],
  onSettingsChange,
  defaultInterval = 15,
  defaultEnabledFolders = []
}: NotificationSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(defaultInterval);
  const [selectedFolders, setSelectedFolders] = useState(new Set(defaultEnabledFolders));
  const [error, setError] = useState('');

  // Interval presets for dropdown
  const intervalPresets = [
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' }
  ];

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({
        isEnabled,
        checkInterval,
        selectedFolders: Array.from(selectedFolders)
      });
    }
  }, [isEnabled, checkInterval, selectedFolders]);

  const handleFolderToggle = (folderName: string) => {
    setSelectedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (interval < 1) {
      setError('Interval must be at least 1 minute');
      return;
    }
    setError('');
    setCheckInterval(interval);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="ml-2">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
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
                onCheckedChange={setIsEnabled}
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
              <CardTitle className="text-lg">Monitored Folders</CardTitle>
              <CardDescription>Select folders to monitor for new commits</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-4 space-y-2">
                  {folders.map(folder => (
                    <div key={folder.name} className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg">
                      <Switch
                        id={`folder-${folder.name}`}
                        checked={selectedFolders.has(folder.name)}
                        onCheckedChange={() => handleFolderToggle(folder.name)}
                      />
                      <Label htmlFor={`folder-${folder.name}`} className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4" />
                        {folder.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettings;
