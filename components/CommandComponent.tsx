"use client";

import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  LogOut,
  Settings,
  Smile,
  User,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";

import { signOut } from "next-auth/react";

export function CommandComponent() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && e.metaKey) {
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
      if (e.key === "D" && e.metaKey && e.shiftKey) {
        router.push("/");
        setOpen(false);
      }
      if (e.key === "P" && e.metaKey && e.shiftKey) {
        router.push("/profile");
        setOpen(false);
      }
      if (e.key === "k" && e.metaKey) {
        signOut();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  return (
    <div className="hidden lg:block">
      <p className="text-sm text-muted-foreground">
        Press{" "}
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>J
        </kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {/*           <CommandGroup heading="Suggestions">
            <CommandItem>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem>
              <Smile className="mr-2 h-4 w-4" />
              <span>Search Emoji</span>
            </CommandItem>
            <CommandItem>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Calculator</span>
            </CommandItem>
          </CommandGroup> */}
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onClick={() => redirect("/")}>
              <User className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
              <CommandShortcut>Shift + ⌘ + D</CommandShortcut>
            </CommandItem>
            <CommandItem onClick={() => redirect("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile settings</span>
              <CommandShortcut>Shift + ⌘ + P</CommandShortcut>
            </CommandItem>
            <CommandItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
              <CommandShortcut>⌘k</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
