import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Tag,
  List,
  FileText,
  CoinsIcon,
  CalendarDays,
  User,
  Repeat,
  Percent,
  Ruler,
} from "lucide-react";
import moment from "moment";
import { Decimal } from "@prisma/client/runtime/client";
import { formatCurrency } from "@/lib/currency";

interface BasicViewProps {
  data: {
    id: string;
    name: string;
    sku: string | null;
    type: string;
    status: string;
    description: string | null;
    unit_price: number;
    unit_cost: number | null;
    currency: string;
    tax_rate: number | null;
    unit: string | null;
    is_recurring: boolean;
    billing_period: string | null;
    category: { id: string; name: string } | null;
    created_by_user: { id: string; name: string | null } | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  ARCHIVED: "destructive",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function BasicView({ data }: BasicViewProps) {
  const formatDate = (date: Date | null | undefined) =>
    date ? moment(date).format("MMM DD, YYYY") : "N/A";

  const formatValue = (value: number | null | undefined) =>
    value != null
      ? formatCurrency(new Decimal(value.toString()), data.currency || "EUR")
      : "N/A";

  const marginPercentage =
    data.unit_price > 0 && data.unit_cost != null
      ? (((data.unit_price - data.unit_cost) / data.unit_price) * 100).toFixed(1)
      : null;

  return (
    <div className="pb-3 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Product Information */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex w-full justify-between items-start">
              <CardTitle>Product Information</CardTitle>
              <Badge variant={statusVariant[data.status] ?? "secondary"}>
                {statusLabel[data.status] ?? data.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Package className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Name</p>
                  <p className="text-sm text-muted-foreground">{data.name}</p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Tag className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">SKU</p>
                  <p className="text-sm text-muted-foreground">
                    {data.sku ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <List className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Type</p>
                  <p className="text-sm text-muted-foreground">
                    {data.type ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <List className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Category</p>
                  <p className="text-sm text-muted-foreground">
                    {data.category?.name ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <FileText className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {data.description ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created By</p>
                  <p className="text-sm text-muted-foreground">
                    {data.created_by_user?.name ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Last Update</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Unit Price</p>
                  <p className="text-sm text-muted-foreground">
                    {formatValue(data.unit_price)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Unit Cost</p>
                  <p className="text-sm text-muted-foreground">
                    {formatValue(data.unit_cost)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Percent className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Margin</p>
                  <p className="text-sm text-muted-foreground">
                    {marginPercentage != null ? `${marginPercentage}%` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Percent className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Tax Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {data.tax_rate != null ? `${data.tax_rate}%` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Ruler className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Unit</p>
                  <p className="text-sm text-muted-foreground">
                    {data.unit ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Repeat className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Recurring</p>
                  <p className="text-sm text-muted-foreground">
                    {data.is_recurring ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {data.is_recurring && data.billing_period && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Repeat className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Billing Period
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.billing_period}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
