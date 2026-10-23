import { Briefcase } from "lucide-react";
import type { NavItem } from "../nav-main";

export default function getHrmMenuItem({ title }: { title: string }): NavItem {
  return { title, url: "/hrm", icon: Briefcase };
}
