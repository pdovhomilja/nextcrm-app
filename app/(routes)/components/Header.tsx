import { CommandComponent } from "@/components/CommandComponent";
import AvatarDropdown from "./ui/AvatarDropdown";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";

import { SetLanguage } from "@/components/SetLanguage";
import FulltextSearch from "./FulltextSearch";
import Link from "next/link";
import { GithubIcon } from "lucide-react";
import Feedback from "./Feedback";

type Props = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lang: string;
};

const Header = ({ id, name, email, avatar, lang }: Props) => {
  return (
    <>
      <div className="flex h-20 justify-between items-center p-5 space-x-5">
        <div className="flex justify-center ">
          <FulltextSearch />
        </div>
        <div className="flex items-center gap-5">
          <CommandComponent />
          <SetLanguage userId={id} />
          <Feedback />
          <ThemeToggle />
          <div className="hidden lg:flex flex-col text-xs text-gray-500">
            <div>{name}</div>
            <div>{email}</div>
            <div>Language: {lang}</div>
          </div>
          <AvatarDropdown avatar={avatar} />
        </div>
      </div>
      <Separator />
    </>
  );
};

export default Header;
