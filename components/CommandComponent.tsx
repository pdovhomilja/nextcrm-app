"use client";

import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  LogOut,
  Settings,
  Smile,
  User,
} from "lucide-react";
import { searchDocuments, type DocumentSearchResult } from "@/actions/documents/search-documents";

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

import { signOut } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

export function CommandComponent() {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [docResults, setDocResults] = React.useState<DocumentSearchResult[]>([]);
  const router = useRouter();
  const t = useTranslations("CommandComponent");

  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setDocResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchDocuments(searchQuery).then(setDocResults).catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

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
        signOut().then(() => { window.location.href = "/sign-in"; });
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  return (
    <div className="hidden lg:block">
      <p className="text-sm text-muted-foreground">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>J
        </kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("placeholder")}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
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
          {docResults.length > 0 && (
            <CommandGroup heading="Documents">
              {docResults.map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => {
                    router.push(`/documents?highlight=${doc.id}`);
                    setOpen(false);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{doc.name}</span>
                    {doc.summary && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {doc.summary}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading={t("settings")}>
            <CommandItem onClick={() => redirect("/")}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("dashboard")}</span>
              <CommandShortcut>Shift + ⌘ + D</CommandShortcut>
            </CommandItem>
            <CommandItem onClick={() => redirect("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("profileSettings")}</span>
              <CommandShortcut>Shift + ⌘ + P</CommandShortcut>
            </CommandItem>
            <CommandItem onClick={async () => { await signOut(); window.location.href = "/sign-in"; }}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("logout")}</span>
              <CommandShortcut>⌘k</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
