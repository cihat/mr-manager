import { useEffect, useRef, useCallback } from 'react';
import FolderList from "@/components/folder-list";
import useStore from "@/store";
import { FolderItem } from "@/types";
import { TimerReset } from "lucide-react";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/ui/card';

interface TerminalComponentProps {
  currentFolder: string | null;
  monoRepoPath: string;
}

const TerminalComponent = ({ currentFolder, monoRepoPath }: TerminalComponentProps) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef<Terminal | null>(null);
  const currentLineRef = useRef('');

  const executeCommand = useCallback(async (command: string, term: Terminal) => {
    if (!currentFolder) {
      term.writeln('\r\nNo folder selected');
      return;
    }

    try {
      const path = `${monoRepoPath}/packages/${currentFolder}`;

      if (command === 'ls') {
        const folders = await invoke('list_folders', { path });
        term.writeln('\r\n' + (folders as string[]).join('  '));
      }
      else if (command.startsWith('git ')) {
        const gitCommand = command.substring(4);
        if (gitCommand.startsWith('log')) {
          const commits = await invoke('list_folder_commits', {
            path,
            page: 0,
            perPage: 10,
            branch: null,
            remote: null
          });
          term.writeln('\r\n' + JSON.stringify(commits, null, 2));
        }
        else if (gitCommand === 'refs' || gitCommand === 'references') {
          const refs = await invoke('get_git_references', { path });
          term.writeln('\r\n' + JSON.stringify(refs, null, 2));
        }
      }
      else if (command === 'pwd') {
        term.writeln('\r\n' + path);
      }
      else if (command === 'help') {
        term.writeln('\r\nAvailable commands:');
        term.writeln('  ls          List directory contents');
        term.writeln('  pwd         Print working directory');
        term.writeln('  git log     Show commit logs');
        term.writeln('  git refs    Show git references');
        term.writeln('  help        Show this help message');
      }
      else if (command === 'clear') {
        term.clear();
      }
      else {
        term.writeln(`\r\nCommand not found: ${command}`);
        term.writeln('Type "help" for available commands');
      }
    } catch (error) {
      term.writeln('\r\nError: ' + error);
    }
    term.write('\r\n$ ');
  }, [currentFolder, monoRepoPath]);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      },
      rows: 30,
      cols: 80
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    xtermRef.current = term;

    term.writeln('Terminal initialized.');
    term.writeln('Type "help" for available commands');
    term.writeln(currentFolder
      ? `Current directory: ${currentFolder}`
      : 'No folder selected. Please select a folder.');

    term.onKey(({ key, domEvent }) => {
      const char = domEvent.key;

      if (char === 'Enter') {
        const commandToExecute = currentLineRef.current.trim();
        if (commandToExecute) {
          executeCommand(commandToExecute, term);
          currentLineRef.current = '';
        } else {
          term.write('\r\n$ ');
        }
      } else if (char === 'Backspace') {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (char.length === 1) {
        currentLineRef.current += key;
        term.write(key);
      }
    });

    term.write('$ ');

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.error('Error fitting terminal:', e);
      }
    }, 100);

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.error('Error fitting terminal:', e);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [currentFolder, executeCommand]);

  useEffect(() => {
    initTerminal();
  }, [initTerminal]);

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="h-8 bg-gray-800 flex items-center px-4 text-white text-sm flex-shrink-0">
        <span className="flex items-center">
          {currentFolder ? (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Current folder: {currentFolder}
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              No folder selected
            </>
          )}
        </span>
      </div>
      <div className="flex-1 overflow-auto scrollbar-hide">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
};

const Apps = () => {
  const { folders, selectedFolder, setSelectedFolder, monoRepoPath } = useStore();

  const onFolderClick = (folder: FolderItem) => {
    setSelectedFolder(folder.name);
  };

  return (
    <Card className="flex">
      <div className=" flex-shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-auto scrollbar-hide">
        <FolderList
          className="max-h-[calc(100vh-64px)] overflow-auto scrollbar-hide"
          folders={folders}
          onClick={onFolderClick}
          icon={TimerReset}
          selectedFolder={selectedFolder}
        />
      </div>

      <div className="flex-1 p-4 overflow-auto max-max-h-[calc(100vh-64px)] scrollbar-hide">
        <TerminalComponent
          currentFolder={selectedFolder}
          monoRepoPath={monoRepoPath}
        />
      </div>
    </Card>
  );
};

export default Apps;
