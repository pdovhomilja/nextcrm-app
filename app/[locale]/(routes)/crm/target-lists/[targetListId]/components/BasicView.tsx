import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CalendarDays,
  MoreHorizontal,
  User,
  Users,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TargetListBasicViewProps {
  data: any;
}

export function BasicView({ data }: TargetListBasicViewProps) {
  if (!data) return <div>Target list not found</div>;

  return (
    <div className="pb-3 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex w-full justify-between">
            <div>
              <CardTitle>{data.name}</CardTitle>
              <CardDescription>ID: {data.id}</CardDescription>
            </div>
            <div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 w-full">
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Users className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {data.description || "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Users className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {data.status ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created by</p>
                  <p className="text-sm text-muted-foreground">
                    {data.crate_by_user?.name || "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created on</p>
                  <p className="text-sm text-muted-foreground">
                    {data.created_on
                      ? moment(data.created_on).format("MMM DD YYYY")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            Targets ({data.targets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.targets || data.targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No targets in this list yet.</p>
          ) : (
            <div className="space-y-2">
              {data.targets.map((t: any) => (
                <div
                  key={t.target_id}
                  className="-mx-2 flex items-center space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="h-4 w-4" />
                  <div className="flex-1">
                    <Link
                      href={`/crm/targets/${t.target?.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {t.target?.first_name} {t.target?.last_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.target?.email || t.target?.mobile_phone || "No contact info"}
                    </p>
                  </div>
                  {t.target?.company && (
                    <Badge variant="outline">{t.target.company}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
