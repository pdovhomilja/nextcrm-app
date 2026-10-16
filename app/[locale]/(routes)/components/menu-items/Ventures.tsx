import { Rocket } from "lucide-react";

import { NavItem } from "../nav-main";

type Props = {
  title: string;
};

export const getVenturesMenuItem = ({ title }: Props): NavItem => {
  return {
    title,
    url: "/ventures",
    icon: Rocket,
  };
};

export default getVenturesMenuItem;
