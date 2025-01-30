import { Folder } from "@/store";
import FolderList from "../folder-list";
import { TimerReset } from "lucide-react";

export const FolderView: React.FC<{
  folders: Folder[];
  loading: boolean;
  onFolderClick: (folder: Folder) => void;
}> = ({ folders, loading, onFolderClick }) => (
  <div className="border-l overflow-scroll max-h-[calc(100vh-136px)]">
    <FolderList
      folders={folders}
      onClick={onFolderClick}
      icon={TimerReset}
      // loading={loading}
    />
  </div>
);
