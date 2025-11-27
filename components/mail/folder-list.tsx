"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMailFolders } from "@/lib/hooks/use-mail-queries";
import { Nav } from "@/components/ui/nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Inbox,
  Send,
  File,
  Star,
  Trash2,
  ArchiveX,
  LucideIcon,
} from "lucide-react";

interface FolderListProps {
  accountId: string;
}

const folderIcons: { [key: string]: LucideIcon } = {
  INBOX: Inbox,
  Sent: Send,
  "Sent Items": Send,
  Drafts: File,
  Starred: Star,
  Junk: ArchiveX,
  Trash: Trash2,
  Archive: ArchiveX,
};

export const FolderList = ({ accountId }: FolderListProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFolder = searchParams.get("folder");

  const { data, isLoading } = useMailFolders(accountId);

  const handleLinkClick = (folderName: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("folder", folderName);
    params.delete("email"); // Reset email when folder changes
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="p-2">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const folders = data?.boxes || [];

  const folderLinks = folders.map((name: string) => {
    const Icon = folderIcons[name] || File;
    return {
      title: name,
      label: "",
      icon: Icon,
      variant: (selectedFolder === name ? "default" : "ghost") as
        | "default"
        | "ghost",
      onClick: () => handleLinkClick(name),
    };
  });

  return (
    <div className="p-2">
      <Nav isCollapsed={false} links={folderLinks} />
    </div>
  );
};
