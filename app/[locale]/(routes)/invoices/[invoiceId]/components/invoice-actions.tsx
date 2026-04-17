"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SendEmailDialog } from "./send-email-dialog";
import { AddPaymentDialog } from "./add-payment-dialog";
import {
  Pencil,
  Copy,
  FileDown,
  Ban,
  CheckCircle,
} from "lucide-react";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  balanceDue: string;
  currency: string;
  accountEmail?: string;
}

export function InvoiceActions({
  invoiceId,
  status,
  balanceDue,
  currency,
  accountEmail,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const isDraft = status === "DRAFT";
  const canPay = [
    "ISSUED",
    "SENT",
    "PARTIALLY_PAID",
    "OVERDUE",
  ].includes(status);
  const canSend = ["ISSUED", "SENT"].includes(status);

  const handleAction = async (
    action: "issue" | "cancel" | "duplicate",
    endpoint: string
  ) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());

      if (action === "duplicate") {
        const result = await res.json();
        toast.success("Invoice duplicated");
        router.push(`/invoices/${result.data.id}`);
      } else {
        toast.success(
          action === "issue" ? "Invoice issued" : "Invoice cancelled"
        );
        router.refresh();
      }
    } catch {
      toast.error(`Failed to ${action} invoice`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isDraft && (
        <>
          <Link href={`/invoices/${invoiceId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAction("issue", "issue")}
            disabled={loading === "issue"}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading === "issue" ? "Issuing..." : "Issue"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Cancel this draft invoice?")) {
                handleAction("cancel", "cancel");
              }
            }}
            disabled={loading === "cancel"}
          >
            <Ban className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </>
      )}

      {canSend && (
        <SendEmailDialog
          invoiceId={invoiceId}
          defaultEmail={accountEmail}
        />
      )}

      {canPay && (
        <AddPaymentDialog
          invoiceId={invoiceId}
          balanceDue={balanceDue}
          currency={currency}
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAction("duplicate", "duplicate")}
        disabled={loading === "duplicate"}
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </Button>

      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </a>
    </div>
  );
}
