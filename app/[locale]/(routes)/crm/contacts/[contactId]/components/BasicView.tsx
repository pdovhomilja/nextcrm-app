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
  Facebook,
  Instagram,
  LayoutGrid,
  Linkedin,
  MoreHorizontal,
  Twitter,
  User,
  Youtube,
} from "lucide-react";
import moment from "moment";
import { prismadb } from "@/lib/prisma";
import Link from "next/link";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";

interface OppsViewProps {
  data: any;
}

export async function BasicView({ data }: OppsViewProps) {
  //console.log(data, "data");
  const users = await prismadb.users.findMany();
  if (!data) return <div>Opportunity not found</div>;
  return (
    <div className="pb-3 space-y-5">
      {/*      <pre>{JSON.stringify(data, null, 2)}</pre> */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex w-full justify-between">
            <div>
              <CardTitle>
                {data.first_name} {data.last_name}
              </CardTitle>
              <CardDescription>ID:{data.id}</CardDescription>
            </div>
            <div>
              {
                //TODO: Add menu
                //TODO: Add edit button
              }
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 w-full ">
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-sm text-muted-foreground">
                    {data.assigned_accounts?.name}
                  </p>
                </div>
              </div>
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
                  <p className="text-sm font-medium leading-none">Birthday</p>
                  <p className="text-sm text-muted-foreground">
                    {data.birthday
                      ? moment(data.birthday).format("MMM DD YYYY")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Description
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.description ? data.description : "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Assigned to
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {users.find((user) => user.id === data.assigned_to)?.name}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {moment(data.created_on).format("MMM DD YYYY")}
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
                  <p className="text-sm font-medium leading-none">
                    Last update
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {moment(data.updatedAt).format("MMM DD YYYY")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Last update by
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {users.find((user) => user.id === data.updatedBy)?.name}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {data.status ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Type</p>
                  <p className="text-sm text-muted-foreground">{data.type}</p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Member of</p>
                  <p className="text-sm text-muted-foreground">
                    {data.member_of}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CoinsIcon className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Industry</p>
                  <p className="text-sm text-muted-foreground">
                    {data.industry}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div> Tags:</div>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag: string) => (
                  <Badge key={tag} variant={"outline"}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3 w-full">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
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
                <p className="text-sm font-medium leading-none">
                  Personal e-mail
                </p>
                {data?.personal_email ? (
                  <Link
                    href={`mailto:${data.personal_email}`}
                    className="flex items-center  gap-5 text-sm text-muted-foreground"
                  >
                    {data.personal_email}
                    <EnvelopeClosedIcon />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Office phone</p>
                <p className="text-sm text-muted-foreground">
                  {data.office_phone}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Mobile phone</p>
                <p className="text-sm text-muted-foreground">
                  {data.mobile_phone}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Website</p>
                <p className="text-sm text-muted-foreground">
                  {data?.website ? (
                    <Link href={data.website}>{data.website}</Link>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Billing country
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.billing_country}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Social networks</CardTitle>
          </CardHeader>
          <CardContent className="gap-1">
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Twitter className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Twitter</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_twitter}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Facebook className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Facebook</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_facebook}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Linkedin className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">LinkedIn</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_linkedin}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <LayoutGrid className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Skype</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_skype}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Instagram className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Instagram</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_instagram}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Youtube className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">YouTube</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_youtube}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <LayoutGrid className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">TikTok</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_tiktok}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        {
          //TODO: Add notes functionality
          //TODO: Delete notes functionality
        }
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.notes.map((note: string) => (
                <p className="text-sm text-muted-foreground" key={note}>
                  {note}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
