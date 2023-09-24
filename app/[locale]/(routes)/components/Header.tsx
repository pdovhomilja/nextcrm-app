import Feedback from "./Feedback";
import FulltextSearch from "./FulltextSearch";
import AvatarDropdown from "./ui/AvatarDropdown";

import { Separator } from "@/components/ui/separator";
import { SetLanguage } from "@/components/SetLanguage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandComponent } from "@/components/CommandComponent";

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
          <div className="hidden lg:flex flex-col text-xs text-gray-500"></div>
          <AvatarDropdown
            avatar={avatar}
            userId={id}
            name={name}
            email={email}
          />
        </div>
      </div>
      <Separator />
    </>
  );
};

export default Header;
