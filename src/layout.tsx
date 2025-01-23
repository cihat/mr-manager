// page.tsx
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import FolderPicker from "./components/folder-picker";
import TypeDocGenerator from "./components/type-doc-generation";
import { useToast } from "@/hooks/use-toast"
import { core } from '@tauri-apps/api';

const { invoke } = core;

export default function Page() {
  const { toast } = useToast()

  const handleDocGeneration = async (path: string) => {
    try {
      const docsPath = await invoke('generate_docs', { path });
      
      toast({
        title: "Documentation generated successfully",
        description: `TypeDoc documentation has been created at: ${docsPath}`
      });
    } catch (error) {
      console.error('Error generating docs:', error);
      toast({
        title: "Error generating documentation",
        description: error.toString(),
        variant: "destructive"
      });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <FolderPicker />
        </header>
        <main className="flex-1 p-4">
          <TypeDocGenerator onComplete={handleDocGeneration} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
