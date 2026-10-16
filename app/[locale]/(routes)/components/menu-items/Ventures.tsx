import { Rocket } from "lucide-react";

import { BUILTIN_VENTURE_APPS } from "@/lib/ventures/catalog";
import { NavItem } from "../nav-main";

type Props = {
  title: string;
  includeNew?: boolean;
};

export const getVenturesMenuItem = ({ title, includeNew }: Props): NavItem => {
  return {
    title,
    icon: Rocket,
    items: [
      { title: "Overview", url: "/ventures" },
      ...BUILTIN_VENTURE_APPS.map((app) => ({
        title: app.name,
        url: app.href,
      })),
      ...(includeNew ? [{ title: "New venture", url: "/ventures/new" }] : []),
    ],
  };
};

export default getVenturesMenuItem;
