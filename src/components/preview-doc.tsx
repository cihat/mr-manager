import { useState } from 'react';
import { Card } from '@/components/ui/card';
import useStore from '@/store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { convertFileSrc } from '@tauri-apps/api/core';

const PreviewDocs = () => {
  const [error, setError] = useState('');
  const selectedFolder = useStore(state => state.selectedFolder);

  if (!selectedFolder) return null;

  const folderPath = `/Users/cihatsalik/mr-analyzer/${selectedFolder}`;
  const assetUrl = convertFileSrc(folderPath);

  return (
    <Card className="w-full h-full p-6 bg-background rounded-none border-none">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="w-full h-full min-h-96 relative bg-white rounded-lg overflow-hidden">
        <iframe
          src={`${assetUrl}/index.html`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
        />
      </div>
    </Card>
  );
};

export default PreviewDocs;
