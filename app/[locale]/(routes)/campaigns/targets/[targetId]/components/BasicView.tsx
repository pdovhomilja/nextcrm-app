import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CalendarDays,
  Building2,
  Facebook,
  Instagram,
  Linkedin,
  MoreHorizontal,
  Phone,
  Twitter,
  User,
  Globe,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { EnrichButton } from "./EnrichButton";
import { TargetContactsTable } from "./TargetContactsTable";

interface TargetContact {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  source: string;
  enrichStatus: string;
}

interface TargetBasicViewProps {
  data: any & { target_contacts?: TargetContact[] };
}

export async function BasicView({ data }: TargetBasicViewProps) {
  if (!data) return <div>Target not found</div>;

  return (
    <div className="pb-3 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex w-full justify-between">
            <div>
              <CardTitle>
                {data.first_name} {data.last_name}
              </CardTitle>
              <CardDescription>ID: {data.id}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <EnrichButton targetId={data.id} />
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 w-full">
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Building2 className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Company</p>
                  <p className="text-sm text-muted-foreground">
                    {data.company || "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Position</p>
                  <p className="text-sm text-muted-foreground">
                    {data.position || "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Globe className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Company website</p>
                  <p className="text-sm text-muted-foreground">
                    {data.company_website ? (
                      <Link href={data.company_website} target="_blank" className="underline">
                        {data.company_website}
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Globe className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Personal website</p>
                  <p className="text-sm text-muted-foreground">
                    {data.personal_website ? (
                      <Link href={data.personal_website} target="_blank" className="underline">
                        {data.personal_website}
                      </Link>
                    ) : (
                      "N/A"
                    )}
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
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <CalendarDays className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Last updated</p>
                  <p className="text-sm text-muted-foreground">
                    {data.updatedAt
                      ? moment(data.updatedAt).format("MMM DD YYYY")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {data.status ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
            {data.tags && data.tags.length > 0 && (
              <div className="col-span-2 flex flex-col gap-2 mt-2">
                <div>Tags:</div>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="gap-1">
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">E-mail</p>
                {data?.email ? (
                  <Link
                    href={`mailto:${data.email}`}
                    className="flex items-center gap-5 text-sm text-muted-foreground"
                  >
                    {data.email}
                    <EnvelopeClosedIcon />
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Phone className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Mobile phone</p>
                <p className="text-sm text-muted-foreground">
                  {data.mobile_phone || "N/A"}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Phone className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Office phone</p>
                <p className="text-sm text-muted-foreground">
                  {data.office_phone || "N/A"}
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
                <p className="text-sm font-medium leading-none">X (Twitter)</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_x || "N/A"}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Linkedin className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">LinkedIn</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_linkedin || "N/A"}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Instagram className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Instagram</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_instagram || "N/A"}
                </p>
              </div>
            </div>
            <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
              <Facebook className="mt-px h-5 w-5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Facebook</p>
                <p className="text-sm text-muted-foreground">
                  {data.social_facebook || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.notes && data.notes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.notes.map((note: string, index: number) => (
                <p className="text-sm text-muted-foreground" key={index}>
                  {note}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.target_lists && data.target_lists.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Target Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.target_lists.map((tl: any) => (
                <Badge key={tl.target_list_id} variant="secondary">
                  {tl.target_list?.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetContactsTable
            targetId={data.id}
            contacts={data.target_contacts ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
