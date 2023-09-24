"use client";

import React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  avatar: string;
  userId: string;
  name: string;
  email: string;
};

const AvatarDropdown = ({ avatar, userId, name, email }: Props) => {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage
            src={
              avatar
                ? avatar
                : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
            }
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="space-y-1">
          <div>{name}</div>
          <div className="text-xs text-gray-500">{email}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/projects/dashboard")}>
          Todo dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/crm/dashboard/${userId}`)}
        >
          Sales dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <Settings className="w-4 h-4 inline-block mr-2 stroke-current text-gray-500" />
          <span>Profile settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 inline-block mr-2 stroke-current text-gray-500" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AvatarDropdown;
