import FolderList from "@/components/folder-list";
import useAppStore from "@/store";
import { FolderItem } from "@/types";
import { TimerReset } from "lucide-react";

const Apps = () => {
  const { folders, selectedFolder } = useAppStore();

  const onFolderClick = (folder: FolderItem) => {
    // setFolders(folder);
    console.log('folder >>', folder)

  }

  return (

    <div>
      <FolderList folders={folders} onClick={onFolderClick} icon={TimerReset} selectedFolder={selectedFolder} />

    </div>
  );
}

export default Apps;
