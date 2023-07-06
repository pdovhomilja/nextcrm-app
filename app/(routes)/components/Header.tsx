import { ThemeToggle } from "@/components/ThemeToggle";
import SignOutButton from "@/components/ui/SignOutButton";

import { signOut } from "next-auth/react";
import Link from "next/link";
import React from "react";
import AvatarDropdown from "./ui/AvatarDropdown";
import { Separator } from "@/components/ui/separator";

type Props = {
  name: string;
  email: string;
  avatar: string;
};

const Header = ({ name, email, avatar }: Props) => {
  return (
    <>
      <div className="flex h-20 justify-end items-center px-5 space-x-5">
        <ThemeToggle />
        <div className="flex flex-col text-xs text-gray-500">
          <div>{name}</div>
          <div>{email}</div>
        </div>
        <AvatarDropdown avatar={avatar} />
      </div>
      <Separator />
    </>
  );
};

export default Header;
