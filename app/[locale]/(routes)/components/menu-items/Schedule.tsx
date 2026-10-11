import { CalendarDays } from "lucide-react";
import { NavItem } from "../nav-main";

export const getScheduleMenuItem = ({ title }: { title: string }): NavItem => ({
  title,
  url: "/schedule",
  icon: CalendarDays,
});

export default getScheduleMenuItem;
