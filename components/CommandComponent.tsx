"use client";

import * as React from "react";
import { FileText, LogOut, Search, Settings, User } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";
import { getCommandShortcutAction } from "@/lib/command-shortcuts";
import { useModKeyLabel } from "@/hooks/use-mod-key";
import { KbdShortcut } from "@/components/KbdShortcut";
import { useTranslations } from "next-intl";

function ModCommandShortcut({ keys }: { keys: string[] }) {
  const mod = useModKeyLabel();
  const label = keys.map((k) => (k === "mod" ? mod : k)).join(" + ");
  return <CommandShortcut>{label}</CommandShortcut>;
}

export function CommandComponent() {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [docResults, setDocResults] = React.useState<DocumentSearchResult[]>([]);
  const router = useRouter();
  const t = useTranslations("CommandComponent");
  const mod = useModKeyLabel();

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
      const action = getCommandShortcutAction(e);
      if (!action) return;
      if (action !== "close") e.preventDefault();
      if (action === "toggle") {
        setOpen((open) => !open);
      }
      if (action === "close") {
        setOpen(false);
      }
      if (action === "dashboard") {
        router.push("/");
        setOpen(false);
      }
      if (action === "profile") {
        router.push("/profile");
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden h-8 gap-2 rounded-lg border-0 bg-transparent px-2 text-muted-foreground shadow-none hover:bg-accent/80 md:inline-flex"
        onClick={() => setOpen(true)}
        aria-label={`Search (${mod}+K)`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="hidden text-xs lg:inline">Search</span>
        <KbdShortcut keys={["mod", "K"]} className="hidden lg:inline-flex" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="header-icon-btn md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-[1.15rem] w-[1.15rem]" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("placeholder")}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>{t("noResults")}</CommandEmpty>
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
            <CommandItem
              onSelect={() => {
                router.push("/");
                setOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>{t("dashboard")}</span>
              <ModCommandShortcut keys={["Shift", "mod", "D"]} />
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/profile");
                setOpen(false);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("profileSettings")}</span>
              <ModCommandShortcut keys={["Shift", "mod", "P"]} />
            </CommandItem>
            <CommandItem
              onSelect={async () => {
                await signOut();
                window.location.href = "/sign-in";
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("logout")}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
