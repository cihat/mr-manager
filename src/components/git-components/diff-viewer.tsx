import { DiffEditor } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { DiffOnMount } from '@monaco-editor/react';
import { Button } from '../ui/button';
import { Backpack, CircleArrowLeft, CircleArrowRight } from 'lucide-react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  language?: string;
}

interface LineChange {
  modifiedStartLineNumber: number;
  modifiedEndLineNumber: number;
  originalStartLineNumber: number;
  originalEndLineNumber: number;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  language = "typescript"
}) => {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [selectedChange, setSelectedChange] = useState<number>(0);
  const [changes, setChanges] = useState<LineChange[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleEditorDidMount: DiffOnMount = (editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Add a small delay to ensure the editor is fully initialized
    setTimeout(() => {
      const lineChanges = editor.getLineChanges();
      if (lineChanges) {
        setChanges(lineChanges);
      }
      setIsLoaded(true);
    }, 100);
  };

  // Update changes when content changes
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !isLoaded) return;

    const editor = editorRef.current;
    const lineChanges = editor.getLineChanges();
    if (lineChanges) {
      setChanges(lineChanges);
      // Reset selected change if out of bounds
      if (selectedChange >= lineChanges.length) {
        setSelectedChange(0);
      }
    }
  }, [isEditorReady, oldContent, newContent, isLoaded]);

  // Handle scrolling
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !isLoaded || changes.length === 0) return;

    const scrollTimeout = setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;

      try {
        const modifiedEditor = editor.getModifiedEditor();
        const currentChange = changes[selectedChange];

        if (currentChange) {
          const lineHeight = modifiedEditor.getOption(modifiedEditor.getModel().getOptions().lineHeight) || 19;
          const targetLine = currentChange.modifiedStartLineNumber;
          const viewportHeight = modifiedEditor.getLayoutInfo().height;
          const scrollPosition = Math.max(0, (targetLine * lineHeight) - (viewportHeight / 2));

          modifiedEditor.revealLineInCenter(targetLine);
          setTimeout(() => {
            modifiedEditor.setScrollPosition({
              scrollTop: scrollPosition,
              scrollLeft: 0,
            });
          }, 50);
        }
      } catch (e) {
        console.error('Scroll error:', e);
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [isEditorReady, selectedChange, changes, isLoaded]);

  return (
    <div className="h-full w-full overflow-hidden">
      {changes.length > 1 && (
        <div className="p-2 flex items-center gap-2">
          <span className="mr-2">
            {selectedChange + 1} / {changes.length}
          </span>
          <Button
            onClick={() => setSelectedChange(prev => Math.max(0, prev - 1))}
            disabled={selectedChange === 0}
            variant="outline"
            size="sm"
            className="min-w-8"
          >
            <CircleArrowLeft /> Back

          </Button>
          <Button
            onClick={() => setSelectedChange(prev => Math.min(changes.length - 1, prev + 1))}
            disabled={selectedChange === changes.length - 1}
            variant="outline"
            size="sm"
            className="min-w-8"
          >
            Next <CircleArrowRight />
          </Button>
        </div>
      )}
      <DiffEditor
        height="100%"
        width="100%"
        language={language}
        original={oldContent}
        modified={newContent}
        onMount={handleEditorDidMount}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          diffWordWrap: "off",
          renderOverviewRuler: false,
          scrollBeyondLastColumn: 0,
          fixedOverflowWidgets: true,
          smoothScrolling: true,
        }}
        theme="vs-dark"
      />
    </div>
  );
};

export default DiffViewer;
