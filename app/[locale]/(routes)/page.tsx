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

import {
  getTasksCount,
  getUsersTasksCount,
} from "@/actions/dashboard/get-tasks-count";
import { getInvoicesCount } from "@/actions/dashboard/get-invoices-count";
import { getCampaignsCount } from "@/actions/dashboard/get-campaigns-count";
import { getTargetsCount } from "@/actions/dashboard/get-targets-count";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { getStorageSize } from "@/actions/documents/get-storage-size";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getContractsCount } from "@/actions/dashboard/get-contracts-count";
import { getDocumentsCount } from "@/actions/dashboard/get-documents-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getDefaultCurrency, formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

const DashboardPage = async () => {
  const session = await getSession();

  if (!session) return null;

  const userId = session?.user?.id;

  const cookieStore = await cookies();
  const defaultCurrency = await getDefaultCurrency();
  const displayCurrency = cookieStore.get("display_currency")?.value || defaultCurrency;

  //Get user language
  const lang = session?.user?.userLanguage;

  //Fetch translations from dictionary
  const dict = await getTranslations("DashboardPage");
  const leads = await getLeadsCount();
  const tasks = await getTasksCount();
  const invoices = await getInvoicesCount();
  const campaigns = await getCampaignsCount();
  const targets = await getTargetsCount();
  const storage = await getStorageSize();
  const projects = await getBoardsCount();
  const contacts = await getContactCount();
  const contracts = await getContractsCount();
  const users = await getActiveUsersCount();
  const accounts = await getAccountsCount();
  const revenue = await getExpectedRevenue(displayCurrency);
  const documents = await getDocumentsCount();
  const opportunities = await getOpportunitiesCount();
  const usersTasks = await getUsersTasksCount(userId);

  return (
    <Container
      title={dict("containerTitle")}
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
          href="/crm/targets"
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
  <Link href={href || "#"}>
    <Suspense fallback={<LoadingBox />}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <IconComponent className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-medium">{content}</div>
        </CardContent>
      </Card>
    </Suspense>
  </Link>
);
