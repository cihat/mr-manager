import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  language?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldContent, newContent, language = "typescript" }) => {
  return (
    <div className="h-full w-full border rounded-md overflow-hidden">
      <DiffEditor
        height="100%"
        width="100%"
        language={language}
        original={oldContent}
        modified={newContent}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          diffWordWrap: "off",
          renderOverviewRuler: false,
        }}
        theme="vs-dark"
      />
    </div>
  );
};

export default DiffViewer;
