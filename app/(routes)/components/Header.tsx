import { CommandComponent } from "@/components/CommandComponent";
import AvatarDropdown from "./ui/AvatarDropdown";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SearchIcon } from "lucide-react";
import { SetLanguage } from "@/components/SetLanguage";

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
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder={"Search"} />
            <Button type="submit" className="gap-2">
              <span className="hidden md:flex">Search</span>
              <SearchIcon />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <CommandComponent />
          <SetLanguage userId={id} />
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
