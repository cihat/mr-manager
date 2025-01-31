import { DynamicIcon, IconName } from "lucide-react/dynamic";

type SubHeaderProps = {
  title: string;
  icon: IconName;
};

const SubHeader = ({ title, icon }: SubHeaderProps) => (
  <div className="flex items-center pl-3 pt-2 pb-0 bg-background">
    {/* <History className="w-8 h-8" /> */}
    <DynamicIcon size="1.5rem" name={icon} />
    <h3 className="font-semibold text-2xl">{title}</h3>
  </div>
);

export default SubHeader
