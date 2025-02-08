import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useStore from "@/store";

const FolderToggle = () => {
  const { currentView, setCurrentView } = useStore();

  return (
    <ToggleGroup
      type="single"
      value={currentView}
      onValueChange={(value: 'libs' | 'apps') => value && setCurrentView(value)}
    >
      {/* // need refactor all folder under the packages */}
      <ToggleGroupItem value="libs" className="">Libs</ToggleGroupItem>
      <ToggleGroupItem value="apps" className="">Apps</ToggleGroupItem>
    </ToggleGroup>
  );
}

export default FolderToggle;
