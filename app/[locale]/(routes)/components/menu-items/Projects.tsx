import { ServerIcon } from "lucide-react";
import { NavItem } from "../nav-main";

/**
 * Projects Module Menu Item - Task Group 2.4
 *
 * Converted from simple Link component to navigation item object.
 * Returns a NavItem object for Projects navigation.
 *
 * Projects module is a simple navigation item (not a collapsible group)
 * pointing to the main projects page at /projects.
 *
 * @param title - Localized label for Projects module
 * @returns NavItem object for Projects navigation
 */

type Props = {
  title: string;
};

export const getProjectsMenuItem = ({ title }: Props): NavItem => {
  return {
    title,
    url: "/projects",
    icon: ServerIcon,
  };
};

export default getProjectsMenuItem;
