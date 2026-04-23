"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "@/app/[locale]/(routes)/invoices/components/invoices-table";

interface InvoicesViewProps {
  data: any;
  accountId?: string;
  statusLabels?: Record<string, string>;
  tableLabels?: {
    number?: string;
    account?: string;
    issueDate?: string;
    dueDate?: string;
    total?: string;
    status?: string;
    type?: string;
    currency?: string;
  };
}

const InvoicesView = ({
  data,
  accountId,
  statusLabels,
  tableLabels,
}: InvoicesViewProps) => {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/invoices")}
              className="cursor-pointer"
            >
              Invoices
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          {accountId && (
            <Link href={`/invoices/new?accountId=${accountId}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New invoice
              </Button>
            </Link>
          )}
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No assigned invoices found"
        ) : (
          <InvoicesTable
            invoices={data}
            statusLabels={statusLabels}
            tableLabels={tableLabels}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default InvoicesView;
