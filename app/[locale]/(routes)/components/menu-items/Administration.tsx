import { ShieldCheck } from "lucide-react";
import { NavItem } from "../nav-main";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";

type Props = {
  title: string;
};

export const getAdministrationMenuItem = ({ title }: Props): NavItem => {
  return {
    title,
    icon: ShieldCheck,
    items: ADMIN_NAV_ITEMS.map((item) => ({
      title: item.title,
      url: item.url,
    })),
  };
};

export default getAdministrationMenuItem;
