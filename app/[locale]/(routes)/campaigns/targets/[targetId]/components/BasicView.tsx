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
  Phone,
  Twitter,
  User,
  Globe,
  MapPin,
  Users,
  Factory,
} from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { TargetAiMenu } from "./TargetAiMenu";
import { listTemplateOptions } from "@/actions/campaigns/templates/list-template-options";
import { listTargetEmails } from "@/actions/crm/targets/list-target-emails";
import { TargetEmailHistory } from "./TargetEmailHistory";
import { HomepageViews } from "./HomepageViews";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { prismadb } from "@/lib/prisma";
import ConvertToDealButton from "./ConvertToDealButton";
import { TargetContactsTable } from "./TargetContactsTable";
import { TriageControl } from "./TriageControl";
import { passReasonLabel } from "../../table-data/triage-options";
import {
  fieldLabel,
  isFieldForType,
  normalizeTargetType,
  resolveTargetTitle,
  targetTypeBadgeVariant,
  targetTypeLabel,
} from "@/lib/crm/target-type";

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

  const type = normalizeTargetType(data.type);
  const location = [data.city, data.country].filter(Boolean).join(", ");

  // AI-email menu data is only needed for APPROVED targets (the menu item is
  // disabled otherwise), so skip the four queries for everything else.
  let templates: {
    id: string;
    name: string;
    cta_label: string | null;
    cta_url: string | null;
  }[] = [];
  let prompts: { id: string; name: string; body: string }[] = [];
  let homepagePrompts: { id: string; name: string; body: string }[] = [];
  let hasHomepage = false;
  let homepageInfo: {
    slug: string;
    status: "PENDING" | "RUNNING" | "READY" | "FAILED";
    preview_url: string | null;
    screenshot_url: string | null;
  } | null = null;
  let homepageViews: { count: number; lastViewedAt: Date | null } | null = null;
  if (data.triage_status === "APPROVED") {
    const [templatesRaw, promptsRaw, homepagePromptsRaw, homepage] =
      await Promise.all([
        listTemplateOptions(),
        listPrompts({ kind: "EMAIL" }),
        listPrompts({ kind: "HOMEPAGE" }),
        prismadb.crm_Target_Homepage.findFirst({
          where: { targetId: data.id, deletedAt: null },
          select: {
            slug: true,
            status: true,
            preview_url: true,
            screenshot_url: true,
            current_version_id: true,
            view_count: true,
            last_viewed_at: true,
          },
        }),
      ]);
    templates = templatesRaw;
    prompts = promptsRaw.map((p) => ({ id: p.id, name: p.name, body: p.body }));
    homepagePrompts = homepagePromptsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      body: p.body,
    }));
    // A page is "available" to the email drawer once it has a published version,
    // regardless of a later RUNNING refine or a FAILED refine — matching the /p/
    // serving gate (current_version_id), not the transient job status.
    hasHomepage = !!homepage?.current_version_id;
    homepageInfo = homepage
      ? {
          slug: homepage.slug,
          status: homepage.status,
          preview_url: homepage.preview_url,
          screenshot_url: homepage.screenshot_url,
        }
      : null;
    homepageViews = homepage
      ? { count: homepage.view_count, lastViewedAt: homepage.last_viewed_at }
      : null;
  }

  // Outreach-email history (always shown, even when empty, so it's clear whether
  // this target has been emailed).
  const targetEmails = await listTargetEmails(data.id);

  return (
    <div className="pb-3 space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex w-full justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {resolveTargetTitle(data)}
                {data.do_not_email && (
                  <Badge variant="destructive" data-testid="do-not-email-badge">
                    Do not email
                  </Badge>
                )}
                <Badge variant={targetTypeBadgeVariant(data.type)}>
                  {targetTypeLabel(data.type)}
                </Badge>
              </CardTitle>
              <CardDescription>ID: {data.id}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TriageControl
                targetId={data.id}
                targetLabel={data.company || `${data.first_name ?? ""} ${data.last_name}`.trim()}
                status={data.triage_status}
              />
              <TargetAiMenu
                targetId={data.id}
                triageStatus={data.triage_status}
                templates={templates}
                prompts={prompts}
                hasHomepage={hasHomepage}
                company={data.company ?? ""}
                companyWebsite={data.company_website ?? null}
                homepagePrompts={homepagePrompts}
                homepage={homepageInfo}
              />
              <ConvertToDealButton targetId={data.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 w-full">
            <div>
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Building2 className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {fieldLabel(type, "company")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.company || "N/A"}
                  </p>
                </div>
              </div>
              {isFieldForType(type, "industry") && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Factory className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {fieldLabel(type, "industry")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.industry || "N/A"}
                    </p>
                  </div>
                </div>
              )}
              {isFieldForType(type, "employees") && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <Users className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {fieldLabel(type, "employees")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.employees || "N/A"}
                    </p>
                  </div>
                </div>
              )}
              {isFieldForType(type, "position") && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <User className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Position</p>
                    <p className="text-sm text-muted-foreground">
                      {data.position || "N/A"}
                    </p>
                  </div>
                </div>
              )}
              {isFieldForType(type, "company_website") && (
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
              )}
              {isFieldForType(type, "personal_website") && (
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
              )}
              {location && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <MapPin className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Location</p>
                    <p className="text-sm text-muted-foreground">{location}</p>
                  </div>
                </div>
              )}
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
              {data.triage_status === "PASSED" && (
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                  <CalendarDays className="mt-px h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Passed</p>
                    <p className="text-sm text-muted-foreground">
                      {passReasonLabel(data.pass_reason) || "—"}
                      {data.revisit_at
                        ? ` · revisit ${moment(data.revisit_at).format("MMM DD YYYY")}`
                        : ""}
                    </p>
                    {data.pass_note ? (
                      <p className="text-sm text-muted-foreground">{data.pass_note}</p>
                    ) : null}
                  </div>
                </div>
              )}
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

      {homepageViews && (
        <HomepageViews
          count={homepageViews.count}
          lastViewedAt={homepageViews.lastViewedAt}
        />
      )}

      <TargetEmailHistory emails={targetEmails} />

      {data.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{fieldLabel(type, "description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {data.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 w-full">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="gap-1">
            {isFieldForType(type, "email") && (
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
            )}
            {isFieldForType(type, "personal_email") && (
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {fieldLabel(type, "personal_email")}
                  </p>
                  {data?.personal_email ? (
                    <Link
                      href={`mailto:${data.personal_email}`}
                      className="flex items-center gap-5 text-sm text-muted-foreground"
                    >
                      {data.personal_email}
                      <EnvelopeClosedIcon />
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">N/A</p>
                  )}
                </div>
              </div>
            )}
            {isFieldForType(type, "mobile_phone") && (
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Phone className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Mobile phone</p>
                  <p className="text-sm text-muted-foreground">
                    {data.mobile_phone || "N/A"}
                  </p>
                </div>
              </div>
            )}
            {isFieldForType(type, "office_phone") && (
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Phone className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Office phone</p>
                  <p className="text-sm text-muted-foreground">
                    {data.office_phone || "N/A"}
                  </p>
                </div>
              </div>
            )}
            {isFieldForType(type, "company_email") && (
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {fieldLabel(type, "company_email")}
                  </p>
                  {data?.company_email ? (
                    <Link
                      href={`mailto:${data.company_email}`}
                      className="flex items-center gap-5 text-sm text-muted-foreground"
                    >
                      {data.company_email}
                      <EnvelopeClosedIcon />
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">N/A</p>
                  )}
                </div>
              </div>
            )}
            {isFieldForType(type, "company_phone") && (
              <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <Phone className="mt-px h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {fieldLabel(type, "company_phone")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.company_phone || "N/A"}
                  </p>
                </div>
              </div>
            )}
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
