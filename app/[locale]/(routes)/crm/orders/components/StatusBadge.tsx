"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline", PENDING_APPROVAL: "secondary", READY: "default", SENT: "default", CONFIRMED: "default",
  DELIVERED: "default", INVOICED: "default", PAID: "secondary", CANCELLED: "outline", SYNC_FAILED: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("OrdersPage");
  return <Badge variant={TONE[status] ?? "outline"}>{t(`status${status}` as never)}</Badge>;
}
