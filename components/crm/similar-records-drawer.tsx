"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSimilarAccounts } from "@/actions/crm/similarity/get-similar-accounts";
import { getSimilarContacts } from "@/actions/crm/similarity/get-similar-contacts";
import { getSimilarLeads } from "@/actions/crm/similarity/get-similar-leads";
import { getSimilarOpportunities } from "@/actions/crm/similarity/get-similar-opportunities";
import type { SimilarityResult, SimilarRecord } from "@/actions/crm/similarity/get-similar-accounts";

type EntityType = "account" | "contact" | "lead" | "opportunity";

const ENTITY_LABELS: Record<EntityType, string> = {
  account: "Accounts",
  contact: "Contacts",
  lead: "Leads",
  opportunity: "Opportunities",
};

async function fetchSimilar(entityType: EntityType, recordId: string): Promise<SimilarityResult> {
  switch (entityType) {
    case "account": return getSimilarAccounts(recordId);
    case "contact": return getSimilarContacts(recordId);
    case "lead": return getSimilarLeads(recordId);
    case "opportunity": return getSimilarOpportunities(recordId);
  }
}

function similarityBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 0.8) return "default";
  if (score >= 0.6) return "secondary";
  return "outline";
}

interface SimilarRecordsDrawerProps {
  entityType: EntityType;
  recordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimilarRecordsDrawer({
  entityType,
  recordId,
  open,
  onOpenChange,
}: SimilarRecordsDrawerProps) {
  const router = useRouter();
  const locale = useLocale();
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setResult(null);
    startTransition(async () => {
      const data = await fetchSimilar(entityType, recordId);
      setResult(data);
    });
  }, [open, entityType, recordId]);

  function handleRecordClick(href: string) {
    onOpenChange(false);
    router.push(`/${locale}${href}`);
  }

  const label = ENTITY_LABELS[entityType];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Similar {label}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-2">
          {isPending && (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </>
          )}

          {!isPending && result?.status === "no_embedding" && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Still generating similarity data. Check back shortly.
            </p>
          )}

          {!isPending && result?.status === "error" && (
            <div className="text-sm text-destructive py-4 text-center space-y-2">
              <p>Failed to load similar records.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  startTransition(async () => {
                    const data = await fetchSimilar(entityType, recordId);
                    setResult(data);
                  });
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {!isPending && result?.status === "ok" && result.records.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No similar {label.toLowerCase()} found yet.
            </p>
          )}

          {!isPending &&
            result?.status === "ok" &&
            result.records.map((record: SimilarRecord) => (
              <button
                key={record.id}
                onClick={() => handleRecordClick(record.href)}
                className="w-full text-left flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{record.name}</p>
                  {record.subtitle && (
                    <p className="text-xs text-muted-foreground">{record.subtitle}</p>
                  )}
                </div>
                <Badge variant={similarityBadgeVariant(record.similarity)}>
                  {Math.round(record.similarity * 100)}% match
                </Badge>
              </button>
            ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
