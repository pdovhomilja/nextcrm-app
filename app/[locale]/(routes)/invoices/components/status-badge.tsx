"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ISSUED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  SENT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  PARTIALLY_PAID:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CANCELLED:
    "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-500",
  DISPUTED:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  REFUNDED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  WRITTEN_OFF:
    "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
  WRITTEN_OFF: "Written Off",
};

interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
}

export function StatusBadge({ status, labels }: StatusBadgeProps) {
  const displayLabels = labels ?? STATUS_LABELS;
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium", STATUS_STYLES[status] ?? "")}
    >
      {displayLabels[status] ?? status}
    </Badge>
  );
}
