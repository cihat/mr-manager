import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Folder, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TypeDocGeneratorProps {
  onComplete?: (path: string) => void;
}

const TypeDocGenerator: React.FC<TypeDocGeneratorProps> = ({ onComplete }) => {
  const [path, setPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const selectDirectory = async (): Promise<void> => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;

      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          setPath(files[0].path);
        }
      };

      input.click();
    } catch (err) {
      setError('Failed to select directory');
    }
  };

  const generateDocs = async (): Promise<void> => {
    if (!path) {
      setError('Please select a project directory');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Here you would implement your documentation generation logic
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      onComplete?.(path);
    } catch (err) {
      setError(`Failed to generate documentation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>TypeDoc Documentation Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Project directory path"
            className="flex-1"
          />
          <Button onClick={selectDirectory} variant="outline">
            <Folder className="w-4 h-4 mr-2" />
            Browse
          </Button>
        </div>
        <Button
          onClick={generateDocs}
          disabled={loading || !path}
          className="w-full"
        >
          {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          Generate Documentation
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>
              Documentation generated successfully in {path}/docs
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TypeDocGenerator;
