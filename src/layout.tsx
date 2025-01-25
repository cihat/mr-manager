// page.tsx
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import FolderPicker from "./components/folder-picker";
import TypeDocGenerator from "./components/type-doc-generation";
import PreviewDocs from "./components/preview-doc";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <FolderPicker />
        </header>
        <main className="flex h-full">
          <TypeDocGenerator />
          <PreviewDocs />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
