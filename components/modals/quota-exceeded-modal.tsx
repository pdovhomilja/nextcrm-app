"use client";

import React from "react";
import { AlertCircle, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: string;
  current: number;
  limit: number;
  plan: string;
}

export function QuotaExceededModal({
  isOpen,
  onClose,
  resourceType,
  current,
  limit,
  plan,
}: QuotaExceededModalProps) {
  const percentage = Math.round((current / limit) * 100);

  const resourceDescription: Record<string, string> = {
    users: "team members",
    contacts: "contacts in your CRM",
    storage: "storage space",
    projects: "projects and boards",
    documents: "documents and files",
    leads: "leads",
    accounts: "accounts",
    opportunities: "opportunities",
    tasks: "tasks",
  };

  const description = resourceDescription[resourceType] || resourceType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <DialogTitle>Usage Limit Exceeded</DialogTitle>
          </div>
          <DialogDescription>
            You have reached your {resourceType} limit on your {plan} plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Current Usage
            </p>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {current} / {limit} {resourceType}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 mt-1">
              {percentage}% of your limit
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              You cannot add more {description} until you upgrade your plan or remove some
              existing {description.split(" ").pop()}.
            </p>
            <p>
              Consider upgrading to a higher plan to increase your limits and unlock more
              features.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild className="gap-2">
            <Link href="/pricing">
              <TrendingUp className="h-4 w-4" />
              View Plans
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
