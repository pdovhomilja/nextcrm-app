import { Mail } from "lucide-react";
import { NavItem } from "../nav-main";

/**
 * Emails Module Menu Item - Task Group 2.5
 *
 * Converted from simple Link component to navigation item object.
 * Returns a NavItem object for Emails navigation.
 *
 * Emails module is a simple navigation item (not a collapsible group)
 * pointing to the main emails page at /emails.
 *
 * @param title - Localized label for Emails module
 * @returns NavItem object for Emails navigation
 */

type Props = {
  title: string;
};

export const getEmailsMenuItem = ({ title }: Props): NavItem => {
  return {
    title,
    url: "/emails",
    icon: Mail,
  };
};

export default getEmailsMenuItem;
