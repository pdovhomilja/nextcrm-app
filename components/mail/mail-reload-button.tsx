"use client";

import React from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MailReloadButton = () => {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["mail"] });

  const handleRefresh = () => {
    // Invalidate all mail queries, forcing refetch of active queries
    queryClient.invalidateQueries({ queryKey: ["mail"] });
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isFetching > 0}
      variant="outline"
      size="icon"
      title="Refresh mail"
    >
      <RefreshCw className={cn("h-4 w-4", isFetching > 0 && "animate-spin")} />
    </Button>
  );
};
