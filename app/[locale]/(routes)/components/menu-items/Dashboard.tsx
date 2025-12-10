import { Home } from "lucide-react";
import { NavItem } from "../nav-main";

/**
 * Dashboard Menu Item - Task Group 2.2
 *
 * Converted from old ModuleMenu pattern to new sidebar item format.
 * Returns a NavItem object compatible with NavMain component.
 *
 * @param title - Localized dashboard title (from dict.ModuleMenu.dashboard)
 * @returns NavItem object for dashboard navigation
 */

type Props = {
  title: string;
};

export const getDashboardMenuItem = ({ title }: Props): NavItem => {
  return {
    title: title,
    url: "/",
    icon: Home,
    // Active state will be detected by NavMain using pathname
  };
};

export default getDashboardMenuItem;
