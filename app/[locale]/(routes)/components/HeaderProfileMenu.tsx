"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  BadgeDollarSign,
  LayoutDashboard,
  Calendar,
  LogOut,
  Settings,
  User,
  ShoppingCart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAvatarContext } from "@/context/avatar-context";
import { cn } from "@/lib/utils";

type Props = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
  };
};

export function HeaderProfileMenu({ user }: Props) {
  const router = useRouter();
  const { avatar } = useAvatarContext();
  const avatarUrl = avatar || user.avatar || undefined;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "relative h-9 gap-2 rounded-xl px-1.5 hover:bg-accent",
            "sm:pl-1 sm:pr-2"
          )}
          aria-label="Profile and settings"
        >
          <Avatar className="h-8 w-8 rounded-lg ring-2 ring-background">
            <AvatarImage src={avatarUrl} alt={user.name || "User"} />
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
            {user.name?.split(" ")[0] || "Profile"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile?tab=calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar connections
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/crm/orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sales & purchase orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/projects/dashboard")}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Todo dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/crm/dashboard/${user.id}`)}>
          <BadgeDollarSign className="mr-2 h-4 w-4" />
          Sales dashboard
        </DropdownMenuItem>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Administration
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/sign-in");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
