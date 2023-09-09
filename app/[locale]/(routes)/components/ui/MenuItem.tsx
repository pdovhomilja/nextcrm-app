import { Inbox, WrenchIcon } from "lucide-react";
import {
  ClipboardEditIcon,
  FileBarChart,
  FileCheckIcon,
  FileTextIcon,
  GraduationCapIcon,
  Home,
  LightbulbIcon,
  Server,
  Users,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

function MenuItem({ open, icon, route, menuItem }: any) {
  let showIcon;
  switch (icon) {
    case "home":
      showIcon = <Home className="w-6" />;
      break;
    case "userGroup":
      showIcon = <Users className="w-6" />;
      break;
    case "user":
      showIcon = <UsersIcon className="w-6" />;
      break;
    case "server":
      showIcon = <Server className="w-6" />;
      break;
    case "document":
      showIcon = <FileTextIcon className="w-6" />;
      break;
    case "documentChart":
      showIcon = <FileBarChart className="w-6" />;
      break;
    case "lightBulb":
      showIcon = <LightbulbIcon className="w-6" />;
      break;
    case "documentCheck":
      showIcon = <FileCheckIcon className="w-6" />;
      break;
    case "clipBoardDocument":
      showIcon = <ClipboardEditIcon className="w-6" />;
      break;
    case "academicCap":
      showIcon = <GraduationCapIcon className="w-6" />;
      break;
    case "wrenchScrewdriver":
      showIcon = <WrenchIcon className="w-6" />;
      break;
    case "inboxIcon":
      showIcon = <Inbox className="w-6" />;
      break;
    default:
      <UsersIcon className="w-8" />;
  }

  return (
    <Link
      href={route}
      className=" w-full hover:bg-slate-700 hover:text-gray-200 hover:transition hover:duration-150 rounded-md mx-auto"
    >
      <div className="flex flex-row items-center mx-auto p-2">
        <div className="p-2">{showIcon}</div>
        {open && <div>{menuItem}</div>}
      </div>
    </Link>
  );
}

export default MenuItem;
