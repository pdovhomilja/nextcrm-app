"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import AssignProductForm from "./AssignProductForm";
import { removeAssignment } from "@/actions/crm/account-products/remove-assignment";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface AccountProductsViewProps {
  data: any[];
  accountId: string;
  crmData: CrmData;
  activeProducts: { id: string; name: string; currency: string }[];
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
};

const AccountProductsView = ({
  data,
  accountId,
  crmData,
  activeProducts,
}: AccountProductsViewProps) => {
  const router = useRouter();
  const { currencies } = crmData;

  const handleCancel = async (id: string) => {
    const result = await removeAssignment(id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Assignment cancelled");
      router.refresh();
    }
  };

  const formatPrice = (item: any) => {
    const price = item.custom_price ?? item.product?.unit_price;
    if (price == null) return "-";
    const num = typeof price === "number" ? price : Number(price);
    const curr = item.currency || item.product?.currency || "EUR";
    return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>
            <Link href="/crm/products" className="hover:underline">
              Products
            </Link>
          </CardTitle>
          <div className="flex space-x-2">
            <AssignProductForm
              accountId={accountId}
              products={activeProducts}
              currencies={currencies.map(
                (c: { code: string; name: string; symbol: string }) => ({
                  code: c.code,
                  name: c.name,
                  symbol: c.symbol,
                })
              )}
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No products assigned to this account"
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/crm/products/${item.product?.id || item.productId}`}
                      className="hover:underline font-medium"
                    >
                      {item.product?.name || "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell>{item.product?.type || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        statusColors[item.status] || "bg-gray-100 text-gray-800"
                      }
                      variant="outline"
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatPrice(item)}</TableCell>
                  <TableCell>{formatDate(item.start_date)}</TableCell>
                  <TableCell>{formatDate(item.end_date)}</TableCell>
                  <TableCell>
                    {(item.status === "ACTIVE" ||
                      item.status === "PENDING") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(item.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountProductsView;
