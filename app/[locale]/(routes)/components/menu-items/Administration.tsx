import { Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  title: string;
};

const AdministrationMenu = ({ open, title }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("admin");
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link
        href={"/admin"}
        className={`flex gap-2 p-2 ${isPath ? "text-muted-foreground" : null}`}
      >
        <Wrench className="w-6" />
        <span className={open ? "" : "hidden"}>{title}</span>
      </Link>
    </div>
  );
};

export default AdministrationMenu;
