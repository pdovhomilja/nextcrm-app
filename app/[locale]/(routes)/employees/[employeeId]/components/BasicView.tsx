import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  CoinsIcon,
  User
} from "lucide-react";

import Link from "next/link";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import moment from "moment";

interface OppsViewProps {
  data: any;
}

export async function BasicView({ data }: OppsViewProps) {
  if (!data) return <div>Employee not found</div>;
  return (
    <div className="pb-3 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {data.firstName} {data.lastName} 
          </CardTitle>
          <CardDescription>ID:{data.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 w-full ">
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Position</p>
                  <p className="text-sm text-muted-foreground">
                    {data.position ? data.position : "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Salary</p>
                  <p className="text-sm text-muted-foreground">
                    {data.salary ? data.salary : "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    onBoarding
                  </p>
                  <p className="text-sm text-muted-foreground">                  
                    {moment(data.onBoarding).format("MMM DD YYYY")}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    IBAN
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.IBAN ? data.IBAN : "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {moment(data.createdAt).format("MMM DD YYYY")}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Insurance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.insurance ? data.insurance : "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="">
              <CardContent className="gap-1">
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">E-mail</p>
                    {data?.email ? (
                      <Link
                        href={`mailto:${data.email}`}
                        className="flex items-center  gap-5 text-sm text-muted-foreground"
                      >
                        {data.email}
                        <EnvelopeClosedIcon />
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      {data.phone}
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {data.address}
                    </p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
       
  );
}
