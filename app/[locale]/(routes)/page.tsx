import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import {
  CoinsIcon,
  Contact,
  DollarSignIcon,
  FactoryIcon,
  FilePenLine,
  HeartHandshakeIcon,
  LandmarkIcon,
  UserIcon,
  Users2Icon,
} from "lucide-react";
import Link from "next/link";

import { getDictionary } from "@/dictionaries";

import Container from "./components/ui/Container";
import NotionsBox from "./components/dasboard/notions";
import LoadingBox from "./components/dasboard/loading-box";
import StorageQuota from "./components/dasboard/storage-quota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  getTasksCount,
  getUsersTasksCount,
} from "@/actions/dashboard/get-tasks-count";
import { getModules } from "@/actions/get-modules";
import { getEmployees } from "@/actions/get-empoloyees";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { getStorageSize } from "@/actions/documents/get-storage-size";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getContractsCount } from "@/actions/dashboard/get-contracts-count";
import { getInvoicesCount } from "@/actions/dashboard/get-invoices-count";
import { getDocumentsCount } from "@/actions/dashboard/get-documents-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session) return null;

  const userId = session?.user?.id;

  //Get user language
  const lang = session?.user?.userLanguage;

  //Fetch translations from dictionary
  const dict = await getDictionary(lang as "en" | "cz" | "de" | "uk"); //Fetch data for dashboard

  const modules = await getModules();
  const leads = await getLeadsCount();
  const tasks = await getTasksCount();
  const employees = await getEmployees();
  const storage = await getStorageSize();
  const projects = await getBoardsCount();
  const contacts = await getContactCount();
  const contracts = await getContractsCount();
  const users = await getActiveUsersCount();
  const accounts = await getAccountsCount();
  const invoices = await getInvoicesCount();
  const revenue = await getExpectedRevenue();
  const documents = await getDocumentsCount();
  const opportunities = await getOpportunitiesCount();
  const usersTasks = await getUsersTasksCount(userId);

  //Find which modules are enabled
  const crmModule = modules.find((module) => module.name === "crm");
  const invoiceModule = modules.find((module) => module.name === "invoice");
  const projectsModule = modules.find((module) => module.name === "projects");
  const documentsModule = modules.find((module) => module.name === "documents");
  const employeesModule = modules.find((module) => module.name === "employees");
  const secondBrainModule = modules.find(
    (module) => module.name === "secondBrain"
  );

  return (
    <Container
      title={dict.DashboardPage.containerTitle}
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<LoadingBox />}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dict.DashboardPage.totalRevenue}
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
                {dict.DashboardPage.expectedRevenue}
              </CardTitle>
              <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">
                {
                  //I need revenue value in format 1.000.000
                  revenue.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })
                }
              </div>
            </CardContent>
          </Card>
        </Suspense>

        <DashboardCard
          href="/admin/users"
          title={dict.DashboardPage.activeUsers}
          IconComponent={UserIcon}
          content={users}
        />
        {
          //show crm module only if enabled is true
          employeesModule?.enabled && (
            <DashboardCard
              href="/employees"
              title="Employees"
              IconComponent={Users2Icon}
              content={employees.length}
            />
          )
        }
        {
          //show crm module only if enabled is true
          crmModule?.enabled && (
            <>
              <DashboardCard
                href="/crm/accounts"
                title={dict.DashboardPage.accounts}
                IconComponent={LandmarkIcon}
                content={accounts}
              />
              <DashboardCard
                href="/crm/opportunities"
                title={dict.DashboardPage.opportunities}
                IconComponent={HeartHandshakeIcon}
                content={opportunities}
              />
              <DashboardCard
                href="/crm/contacts"
                title={dict.DashboardPage.contacts}
                IconComponent={Contact}
                content={contacts}
              />
              <DashboardCard
                href="/crm/leads"
                title={dict.DashboardPage.leads}
                IconComponent={CoinsIcon}
                content={leads}
              />
              <DashboardCard
                href="/crm/contracts"
                title={dict.ModuleMenu.crm.contracts}
                IconComponent={FilePenLine}
                content={contracts}
              />
            </>
          )
        }
        {projectsModule?.enabled && (
          <>
            <DashboardCard
              href="/projects"
              title={dict.DashboardPage.projects}
              IconComponent={CoinsIcon}
              content={projects}
            />
            <DashboardCard
              href="/projects/tasks"
              title={dict.DashboardPage.tasks}
              IconComponent={CoinsIcon}
              content={tasks}
            />
            <DashboardCard
              href={`/projects/tasks/${userId}`}
              title={dict.DashboardPage.myTasks}
              IconComponent={CoinsIcon}
              content={usersTasks}
            />
          </>
        )}
        {invoiceModule?.enabled && (
          <DashboardCard
            href="/invoice"
            title={dict.DashboardPage.invoices}
            IconComponent={CoinsIcon}
            content={invoices}
          />
        )}
        {documentsModule?.enabled && (
          <DashboardCard
            href="/documents"
            title={dict.DashboardPage.documents}
            IconComponent={CoinsIcon}
            content={documents}
          />
        )}

        <StorageQuota actual={storage} title={dict.DashboardPage.storage} />

        {secondBrainModule?.enabled && (
          <Suspense fallback={<LoadingBox />}>
            <NotionsBox />
          </Suspense>
        )}
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
