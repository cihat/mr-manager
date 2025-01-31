import { DynamicIcon, IconName } from "lucide-react/dynamic";

type SubHeaderProps = {
  title: string;
  icon: IconName;
  children?: React.ReactNode;
};

const SubHeader = ({ title, icon, children }: SubHeaderProps) => (
  <div className="flex items-center pl-3 pt-2 pb-0 bg-background">
    {/* <History className="w-8 h-8" /> */}
    <div className="flex items-center">
      <DynamicIcon size="1.5rem" name={icon} className="mr-2" />
      <h3 className="font-semibold text-2xl">{title}</h3>
    </div>
    {children}
  </div>
);

export default SubHeader
