import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import useStore from '@/store';
// import { os } from '@tauri-apps/api';
import { readTextFile } from '@tauri-apps/plugin-fs';
import * as pathTauri from '@tauri-apps/api/path';

const PreviewDocs = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [username, setUsername] = useState('cihatsalik');
  const selectedFolder = useStore(state => state.selectedFolder);

  useEffect(() => {
    // const getUsername = async () => {
    //   try {
    //     const platform = await os.platform();
    //     const osType = platform.toLowerCase();

    //     if (osType === 'windows') {
    //       const username = await os.env('USERNAME');
    //       setUsername(username || '');
    //     } else {
    //       const username = await os.env('USER');
    //       setUsername(username || '');
    //     }
    //   } catch (error) {
    //     console.error('Error getting username:', error);
    //   }
    // };

    // getUsername();
  }, []);

  useEffect(() => {
    const fetchHtml = async () => {
      if (!selectedFolder) return;

      try {
        const path = await pathTauri.join(selectedFolder, 'index.html');
        // const content = await window.fs.readFile(path, { encoding: 'utf8' });
        const content = await readTextFile(path);

        setHtmlContent(content);
      } catch (error) {
        console.error('Error loading HTML:', error);
        setHtmlContent('');
      }
    };

    fetchHtml();
  }, [selectedFolder]);

  return (
    <Card className="w-full h-full p-4 bg-white rounded-lg shadow-md">
      {username && (
        <div className="mb-2 text-sm text-gray-600">
          Current user: {username}
        </div>
      )}
      <iframe
        srcDoc={htmlContent}
        className="w-full h-96 border-0 rounded-md bg-white"
        sandbox="allow-scripts allow-same-origin"
        title={`Preview of ${selectedFolder}`}
      />
    </Card>
  );
};

export default PreviewDocs;
