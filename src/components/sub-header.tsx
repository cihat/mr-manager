import { DynamicIcon, IconName } from "lucide-react/dynamic";

type SubHeaderProps = {
  title: string;
  icon: IconName;
  children?: React.ReactNode;
};

const SubHeader = ({ title, icon, children }: SubHeaderProps) => (
  <div className="flex items-center p-2 bg-background">
    {/* <History className="w-8 h-8" /> */}
    <div className="flex items-center">
      <DynamicIcon name={icon} className="mr-2" />
      <h3 className="font-semibold text-2xl">{title}</h3>
    </div>
    {children}
  </div>
);

export default SubHeader
