import { Suspense } from "react";
import { getSession } from "@/lib/auth-server";
import {
  CoinsIcon,
  Contact,
  DollarSignIcon,
  FilePenLine,
  FileText,
  HeartHandshakeIcon,
  LandmarkIcon,
  Megaphone,
  Target,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

import Container from "./components/ui/Container";
import LoadingBox from "./components/dasboard/loading-box";
import StorageQuota from "./components/dasboard/storage-quota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { loadDashboardMetrics } from "@/actions/dashboard/load-dashboard-metrics";
import { getCachedDefaultCurrency } from "@/lib/server/cached-platform";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

const DashboardPage = async () => {
  const session = await getSession();

  if (!session) return null;

  const userId = session?.user?.id;

  const [cookieStore, defaultCurrency, dict] = await Promise.all([
    cookies(),
    getCachedDefaultCurrency(),
    getTranslations("DashboardPage"),
  ]);

  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;
  const {
    leads,
    tasks,
    invoices,
    campaigns,
    targets,
    storage,
    projects,
    contacts,
    contracts,
    users,
    accounts,
    revenue,
    documents,
    opportunities,
    usersTasks,
  } = await loadDashboardMetrics(userId, displayCurrency);

  const lang = session?.user?.userLanguage;

  return (
    <Container
      title={dict("containerTitle")}
      description={
        "Welcome to VenSai CRM — here you can see your company overview"
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Suspense fallback={<LoadingBox />}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict("totalRevenue")}
              </CardTitle>
              <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">{"0"}</div>
            </CardContent>
          </Card>
        </Suspense>
        <Suspense fallback={<LoadingBox />}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict("expectedRevenue")}
              </CardTitle>
              <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">
                {formatCurrencyUtil(new Decimal(revenue), displayCurrency)}
              </div>
            </CardContent>
          </Card>
        </Suspense>

        <DashboardCard
          href="/admin/users"
          title={dict("activeUsers")}
          IconComponent={UserIcon}
          content={users}
        />
        <DashboardCard
          href="/invoices"
          title={dict("invoices")}
          IconComponent={FileText}
          content={invoices}
        />
        <DashboardCard
          href="/campaigns"
          title={dict("campaigns")}
          IconComponent={Megaphone}
          content={campaigns}
        />
        <DashboardCard
          href="/campaigns/targets"
          title={dict("targets")}
          IconComponent={Target}
          content={targets}
        />
        <DashboardCard
          href="/crm/accounts"
          title={dict("accounts")}
          IconComponent={LandmarkIcon}
          content={accounts}
        />
        <DashboardCard
          href="/crm/opportunities"
          title={dict("opportunities")}
          IconComponent={HeartHandshakeIcon}
          content={opportunities}
        />
        <DashboardCard
          href="/crm/contacts"
          title={dict("contacts")}
          IconComponent={Contact}
          content={contacts}
        />
        <DashboardCard
          href="/crm/leads"
          title={dict("leads")}
          IconComponent={CoinsIcon}
          content={leads}
        />
        <DashboardCard
          href="/crm/contracts"
          title={dict("contracts")}
          IconComponent={FilePenLine}
          content={contracts}
        />
        <DashboardCard
          href="/projects"
          title={dict("projects")}
          IconComponent={CoinsIcon}
          content={projects}
        />
        <DashboardCard
          href="/projects/tasks"
          title={dict("tasks")}
          IconComponent={CoinsIcon}
          content={tasks}
        />
        <DashboardCard
          href={`/projects/tasks/${userId}`}
          title={dict("myTasks")}
          IconComponent={CoinsIcon}
          content={usersTasks}
        />
        <DashboardCard
          href="/documents"
          title={dict("documents")}
          IconComponent={CoinsIcon}
          content={documents}
        />

        <StorageQuota actual={storage} title={dict("storage")} />
      </div>
    </Container>
  );
};

export default DashboardPage;

const DashboardCard = ({
  href,
  title,
  IconComponent,
  content,
}: {
  href?: string;
  title: string;
  IconComponent: any;
  content: number;
}) => (
  <Link href={href || "#"} className="block h-full">
    <Suspense fallback={<LoadingBox />}>
      <Card className="stat-card-hover h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{content}</div>
        </CardContent>
      </Card>
    </Suspense>
  </Link>
);
