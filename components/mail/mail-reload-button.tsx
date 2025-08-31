"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MailReloadButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isPending}
      variant="outline"
      size="icon"
    >
      <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
    </Button>
  );
};
