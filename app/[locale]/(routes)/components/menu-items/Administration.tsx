import { Wrench } from "lucide-react";
import { NavItem } from "../nav-main";

/**
 * Administration Module Menu Item - Task Group 2.7
 *
 * Converted from Link component to navigation item object.
 * Returns a NavItem object for Administration navigation.
 *
 * Administration module is a simple navigation item (not a collapsible group)
 * pointing to the admin panel at /admin.
 *
 * IMPORTANT: This menu item should ONLY be visible to admin users.
 * Role-based visibility check (session.user.is_admin === true) is implemented
 * in the app-sidebar.tsx component, not here.
 *
 * @param title - Localized label for Administration module
 * @returns NavItem object for Administration navigation
 */

type Props = {
  title: string;
};

export const getAdministrationMenuItem = ({ title }: Props): NavItem => {
  return {
    title,
    url: "/admin",
    icon: Wrench,
  };
};

export default getAdministrationMenuItem;
