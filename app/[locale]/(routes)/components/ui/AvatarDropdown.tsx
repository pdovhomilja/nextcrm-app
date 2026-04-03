"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAvatarContext } from "@/context/avatar-context";

type Props = {
  avatar: string;
  userId: string;
  name: string;
  email: string;
};

const AvatarDropdown = ({ avatar, userId, name, email }: Props) => {
  const router = useRouter();
  const { avatar: newAvatar } = useAvatarContext();

  //console.log(newAvatar, "newAvatar");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage
            src={
              newAvatar
                ? newAvatar
                : `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`
            }
          />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="space-y-1">
          <div>{name}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
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
          <Settings className="w-4 h-4 inline-block mr-2 stroke-current text-muted-foreground" />
          <span>Profile settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => { await signOut(); window.location.href = "/sign-in"; }}>
          <LogOut className="w-4 h-4 inline-block mr-2 stroke-current text-muted-foreground" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AvatarDropdown;
