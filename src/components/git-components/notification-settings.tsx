// components/notification-settings.tsx
import { useState, useMemo } from 'react';
import { Bell, Settings2, FolderGit2, Search, Volume2, VolumeX } from 'lucide-react';
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
  const { updateNotificationSettings, notificationSettings } = useStore();
  const { monitoredFolders, checkInterval, isEnabled, soundEnabled, selectedSound } = notificationSettings;

  // Available notification sounds
  const availableSounds = [
    { value: 'pop-alert', label: 'Pop Alert' },
    { value: 'notification', label: 'Long Pop' },
    { value: 'sci-fi-confirmation', label: 'Sci Fi Confirmation' },
    { value: 'software-interface-back', label: 'Software Interface Back' },
    { value: 'arabian-mystery-harp', label: 'Arabian Mystery Harp' },
    { value: 'confirmation-tone', label: 'Confirmation Tone' },
    { value: 'happy-bells', label: 'Happy Bells' },
    { value: 'interface-option-select', label: 'Interface Option Select' },
    { value: 'magic-notification-ring', label: 'Magic Notification Ring' },
    { value: 'melodical-flute-music', label: 'Melodical Flute Music' },
    { value: 'positive-notification', label: 'Positive Notification' },
    { value: 'software-interface', label: 'Software Interface' },
    { value: 'urgent-simple-tone-loop', label: 'Urgent Simple Tone Loop' },
    { value: 'wrong-answer-fail', label: 'Wrong Answer Fail' },
    { value: 'angry-cartoon-kitty-meow', label: 'Angry Cartoon Kitty Meow' },
    { value: 'cartoon-kitty-begging-meow', label: 'Cartoon Kitty Begging Meow' },
    { value: 'cartoon-little-cat-meow', label: 'Cartoon Little Cat Meow' },
    { value: 'domestic-cat-hungry-meow', label: 'Domestic Cat Hungry Meow' },
    { value: 'little-cat-attention-meow', label: 'Little Cat Attention Meow' },
    { value: 'little-cat-pain-meow', label: 'Little Cat Pain Meow' },
    { value: 'sweet-kitty-meow', label: 'Sweet Kitty Meow' },
  ];

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

  const fuse = useMemo(() => new Fuse(folders, {
    keys: ['name'],
    threshold: 0.3,
    shouldSort: true
  }), [folders]);

  // Filter folders based on search query
  const sortedAndFilteredFolders = useMemo(() => {
    let filteredResults = searchQuery
      ? fuse.search(searchQuery).map(result => result.item)
      : folders;

    // Sort folders: monitored folders first, then alphabetically within each group
    return filteredResults.sort((a, b) => {
      const isAMonitored = monitoredFolders.includes(a.name);
      const isBMonitored = monitoredFolders.includes(b.name);

      if (isAMonitored && !isBMonitored) return -1;
      if (!isAMonitored && isBMonitored) return 1;

      // If both are monitored or both are not monitored, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, folders, fuse, monitoredFolders]);

  // Rest of the component logic remains the same...
  const handleFolderToggle = (folderName: string) => {
    updateNotificationSettings({
      ...notificationSettings,
      monitoredFolders: monitoredFolders.includes(folderName)
        ? monitoredFolders.filter(name => name !== folderName)
        : [...monitoredFolders, folderName]
    });
  };
  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (interval < 1) {
      setError('Interval must be at least 1 minute');
      return;
    }
    setError('');
    updateNotificationSettings({
      ...notificationSettings,
      checkInterval: interval
    });
  };

  const previewSound = async (soundName: string) => {
    try {
      const audio = new Audio(`/sound/${soundName}.mp3`);
      await audio.play();
    } catch (error) {
      console.error('Error playing preview sound:', error);
    }
  };

  const handleSoundChange = (value: string) => {
    updateNotificationSettings({
      ...notificationSettings,
      selectedSound: value
    });
  };

  const toggleSound = () => {
    updateNotificationSettings({
      ...notificationSettings,
      soundEnabled: !soundEnabled
    });
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
                  ...notificationSettings,
                  isEnabled: !isEnabled
                })}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sound Settings</CardTitle>
              <CardDescription>Configure notification sound preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                  <Label htmlFor="sound-enabled">Enable Sound Notifications</Label>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={soundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>

              <div className="flex items-center gap-4">
                <Select
                  value={selectedSound}
                  onValueChange={handleSoundChange}
                  disabled={!soundEnabled}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSounds.map(sound => (
                      <div key={sound.value} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent">
                        <SelectItem value={sound.value}>
                          {sound.label}
                        </SelectItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            previewSound(sound.value);
                          }}
                        >
                          <Bell className="h-4 w-4" />
                          <span className="sr-only">Play {sound.label}</span>
                        </Button>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <div className='flex justify-between w-full'>
                <div>
                  <CardTitle className="text-lg">Monitored Folders</CardTitle>
                  <CardDescription>Select folders to monitor for new commits</CardDescription>
                </div>
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
                  {sortedAndFilteredFolders.map(folder => (
                    <div
                      key={folder.name}
                      className={`flex items-center gap-2 p-2 hover:bg-accent rounded-lg ${monitoredFolders.includes(folder.name) ? 'bg-accent/50' : ''
                        }`}
                    >
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
                  {sortedAndFilteredFolders.length === 0 && (
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
    </Dialog>
  );
};

export default NotificationSettings;
