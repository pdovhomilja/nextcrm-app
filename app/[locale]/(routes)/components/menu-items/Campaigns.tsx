import { Megaphone } from "lucide-react";
import { NavItem } from "../nav-main";

type Props = {
  localizations: {
    title: string;
    campaigns: string;
    templates: string;
    prompts: string;
    targets: string;
    targetLists: string;
  };
};

export const getCampaignsMenuItem = ({ localizations }: Props): NavItem => {
  return {
    title: localizations.title,
    icon: Megaphone,
    items: [
      { title: localizations.campaigns, url: "/campaigns" },
      { title: localizations.templates, url: "/campaigns/templates" },
      { title: localizations.prompts, url: "/campaigns/prompts" },
      { title: localizations.targets, url: "/campaigns/targets" },
      { title: localizations.targetLists, url: "/campaigns/target-lists" },
    ],
  };
};

export default getCampaignsMenuItem;
