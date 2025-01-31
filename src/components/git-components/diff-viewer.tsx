import { DiffEditor } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { DiffOnMount } from '@monaco-editor/react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  language?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  language = "typescript"
}) => {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorDidMount: DiffOnMount = (editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;

    const scrollTimeout = setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;

      try {
        const modifiedEditor = editor.getModifiedEditor();
        const changes = editor.getLineChanges();

        if (changes?.length) {
          const firstChange = changes[0];
          const lineHeight = modifiedEditor.getOption(modifiedEditor.getModel().getOptions().lineHeight) || 19;
          const targetLine = firstChange.modifiedStartLineNumber;
          const viewportHeight = modifiedEditor.getLayoutInfo().height;
          const scrollPosition = Math.max(0, (targetLine * lineHeight) - (viewportHeight / 2));
          modifiedEditor.revealLineInCenter(targetLine);

          setTimeout(() => {
            modifiedEditor.setScrollPosition({
              scrollTop: scrollPosition,
              scrollLeft: 0
            });
          }, 50);
        }
      } catch (e) {
        console.error('Scroll error:', e);
      }
    }, 500);

    return () => clearTimeout(scrollTimeout);
  }, [isEditorReady, oldContent, newContent]);

  return (
    <div className="h-full w-full overflow-hidden">
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
        }}
        theme="vs-dark"
      />
    </div>
  );
};

export default DiffViewer;
