import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import useStore from '@/store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import { join } from '@tauri-apps/api/path';
import { Loader2, Folder, FileWarning } from "lucide-react";

const PreviewDocs = () => {
  const [loading, setLoading] = useState(false);
  const { error, setError, selectedFolder, currentGeneratedFolder } = useStore();
  const [assetUrl, setAssetUrl] = useState('');

  const handleFolderSelect = async () => {
    setLoading(true);
    setError('');
    try {
      const homeDirPath = await homeDir();
      const folderPath = await join(homeDirPath, 'mr-manager', selectedFolder || '');
      const assetUrl = convertFileSrc(folderPath);
      const isExist = await invoke('file_exists', { path: `${folderPath}/index.html` });

      if (!isExist) {
        setError('Please generate documentation first.');
      }
      setAssetUrl(assetUrl);
    } catch (err) {
      setError('Failed to load documentation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFolder) {
      handleFolderSelect();
    }
  }, [selectedFolder, currentGeneratedFolder]);

  return (
    <Card className="w-full h-full p-2 bg-background rounded-none border-none">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
            <AlertDescription>Loading documentation...</AlertDescription>
          </div>
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <FileWarning className="w-12 h-12 text-red-500 mx-auto" />
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Documentation Not Found</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      ) : !selectedFolder ? (
        <Card className="w-full h-full flex items-center justify-center p-8 bg-background rounded-none border-none">
          <div className="text-center space-y-4">
            <Folder className="w-12 h-12 text-gray-400 mx-auto" />
            <AlertTitle className="text-lg font-medium">No Folder Selected</AlertTitle>
            <AlertDescription className="text-gray-500">
              Please select a folder to preview the documentation
            </AlertDescription>
          </div>
        </Card>
      )
        : (
          <div className="w-full h-full min-h-96 relative bg-white rounded-lg overflow-hidden">
            <iframe
              src={`${assetUrl}/index.html`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="HTML Preview"
            />
          </div>
        )
      }
    </Card >
  );
};

export default PreviewDocs;
