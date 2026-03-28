import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  CoinsIcon,
  FileText,
  List,
  User,
  Building2,
  Bell,
  PenLine,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { prismadb } from "@/lib/prisma";

interface BasicViewProps {
  data: any;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  NOTSTARTED: "secondary",
  INPROGRESS: "default",
  SIGNED: "destructive",
};

const statusLabel: Record<string, string> = {
  NOTSTARTED: "Not Started",
  INPROGRESS: "In Progress",
  SIGNED: "Signed",
};

export async function BasicView({ data }: BasicViewProps) {
  const users = await prismadb.users.findMany();

  if (!data) return <div>Contract not found</div>;

  const formatDate = (date: Date | null | undefined) =>
    date ? moment(date).format("MMM DD, YYYY") : "N/A";

  const formatCurrency = (value: number | null | undefined) =>
    value != null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : "N/A";

  return (
    <div className="pb-3 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex w-full justify-between items-start">
            <div>
              <CardTitle>{data.title}</CardTitle>
              <CardDescription>ID: {data.id}</CardDescription>
            </div>
            <Badge variant={statusVariant[data.status] ?? "secondary"}>
              {statusLabel[data.status] ?? data.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 w-full gap-5">
            {/* Left column */}
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Value</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(data.value)}
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
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.startDate)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.endDate)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Bell className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Renewal Reminder
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.renewalReminderDate)}
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
            </div>

            {/* Right column */}
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <PenLine className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Customer Signed Date
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.customerSignedDate)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <PenLine className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Company Signed Date
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.companySignedDate)}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Building2 className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Assigned Account
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.assigned_account ? (
                      <Link
                        href={`/crm/accounts/${data.assigned_account.id}`}
                        className="underline hover:text-foreground"
                      >
                        {data.assigned_account.name}
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Assigned To</p>
                  <p className="text-sm text-muted-foreground">
                    {data.assigned_to_user?.name ?? "N/A"}
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
                  <p className="text-sm font-medium leading-none">Created by</p>
                  <p className="text-sm text-muted-foreground">
                    {users.find((user) => user.id === data.createdBy)?.name ??
                      "N/A"}
                  </p>
                </div>
              </div>

              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Last Update</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.updatedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Updated by</p>
                  <p className="text-sm text-muted-foreground">
                    {users.find((user) => user.id === data.updatedBy)?.name ??
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
