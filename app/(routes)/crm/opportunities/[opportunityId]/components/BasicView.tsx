import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { crm_Opportunities } from "@prisma/client";
import {
  CalendarDays,
  ClipboardList,
  CoinsIcon,
  Combine,
  Landmark,
  List,
  SquareStack,
  Text,
  User,
} from "lucide-react";
import moment from "moment";
import { Clapperboard } from "lucide-react";
import { prismadb } from "@/lib/prisma";

interface OppsViewProps {
  data: {
    assigned_sales_stage: { name: string };
    assigned_to_user: { name: string };
    assigned_account: { name: string };
    assigned_type: { name: string };
  } & crm_Opportunities;
}

export async function BasicView({ data }: OppsViewProps) {
  //console.log(data, "data");
  const users = await prismadb.users.findMany();
  if (!data) return <div>Opportunity not found</div>;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{data.name}</CardTitle>
        <CardDescription>ID:{data.id}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-1">
        <div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <CoinsIcon className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                Opportunity amount
              </p>
              <p className="text-sm text-muted-foreground">{data.budget}</p>
            </div>
          </div>

          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <SquareStack className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Sales stage</p>
              <p className="text-sm text-muted-foreground">
                {data.assigned_sales_stage?.name
                  ? data.assigned_sales_stage?.name
                  : "Not assigned"}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <Combine className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Next step</p>
              <p className="text-sm text-muted-foreground">{data.next_step}</p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <ClipboardList className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Description</p>
              <p className="text-sm text-muted-foreground">
                {data.description}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <User className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Assigned to</p>
              <p className="text-sm text-muted-foreground">
                {data.assigned_to_user.name}
              </p>
            </div>
          </div>
        </div>
        <div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <Landmark className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Account name</p>
              <p className="text-sm text-muted-foreground">
                {data.assigned_account?.name
                  ? data.assigned_account?.name
                  : "Not assigned"}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <CalendarDays className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                Expected close date
              </p>
              <p className="text-sm text-muted-foreground">
                {moment(data.close_date).format("MMM DD YYYY")}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <CalendarDays className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Date created</p>
              <p className="text-sm text-muted-foreground">
                {moment(data.createdAt).format("MMM DD YYYY")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Created by</p>
              <p className="text-sm text-muted-foreground">
                {users.find((user) => user.id === data.createdBy)?.name}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <CalendarDays className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Last update</p>
              <p className="text-sm text-muted-foreground">
                {moment(data.updatedAt).format("MMM DD YYYY")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Last update by</p>
              <p className="text-sm text-muted-foreground">
                {users.find((user) => user.id === data.updatedBy)?.name}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <List className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Type</p>
              <p className="text-sm text-muted-foreground">
                {data.assigned_type?.name ? data.assigned_type?.name : "N/A"}
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <Landmark className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Lead source</p>
              <p className="text-sm text-muted-foreground">
                Will be added in the future
              </p>
            </div>
          </div>
          <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
            <Clapperboard className="mt-px h-5 w-5" />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Campaign</p>
              <p className="text-sm text-muted-foreground">
                Will be added in the future
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
