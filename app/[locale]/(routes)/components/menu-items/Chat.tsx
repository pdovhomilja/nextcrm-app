import { MessageCircle } from "lucide-react";
import { NavItem } from "../nav-main";

type Props = {
  title: string;
};

export const getChatMenuItem = ({ title }: Props): NavItem => ({
  title,
  url: "/chat",
  icon: MessageCircle,
});

export default getChatMenuItem;
