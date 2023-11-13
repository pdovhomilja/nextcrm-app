import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import {
  CoinsIcon,
  Contact,
  DollarSignIcon,
  FactoryIcon,
  LandmarkIcon,
  UserIcon,
  Users2Icon,
} from "lucide-react";
import Link from "next/link";

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
import { getInvoicesCount } from "@/actions/dashboard/get-invoices-count";
import { getDocumentsCount } from "@/actions/dashboard/get-documents-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const userId = session?.user?.id;

  //Fetch data for dashboard
  const modules = await getModules();
  const leads = await getLeadsCount();
  const tasks = await getTasksCount();
  const employees = await getEmployees();
  const storage = await getStorageSize();
  const projects = await getBoardsCount();
  const contacts = await getContactCount();
  const users = await getActiveUsersCount();
  const accounts = await getAccountsCount();
  const invoices = await getInvoicesCount();
  const revenue = await getExpectedRevenue();
  const documents = await getDocumentsCount();
  const opportunities = getOpportunitiesCount();
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
      title="Dashboard"
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{"0"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expected Revenue
            </CardTitle>
            <DollarSignIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              {
                //I need revenue value in forma 1.000.000
                revenue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })
              }
            </div>
          </CardContent>
        </Card>
        <Link href="/admin/users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active users
              </CardTitle>
              <UserIcon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium">{users}</div>
            </CardContent>
          </Card>
        </Link>
        {
          //show crm module only if enabled is true
          employeesModule?.enabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees</CardTitle>
                <Users2Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium">{employees.length}</div>
              </CardContent>
            </Card>
          )
        }
        {
          //show crm module only if enabled is true
          crmModule?.enabled && (
            <>
              <Link href="/crm/accounts">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Accounts
                    </CardTitle>
                    <LandmarkIcon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium">{accounts}</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/crm/opportunities">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Opportunities
                    </CardTitle>
                    <FactoryIcon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium">{opportunities}</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/crm/contacts">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Contacts
                    </CardTitle>
                    <Contact className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium">{contacts}</div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/crm/leads">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Leads</CardTitle>
                    <CoinsIcon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium">{leads}</div>
                  </CardContent>
                </Card>
              </Link>
            </>
          )
        }
        {projectsModule?.enabled && (
          <>
            <Link href="/projects">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Projects
                  </CardTitle>
                  <CoinsIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-medium">{projects}</div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/projects/tasks">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                  <CoinsIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-medium">{tasks}</div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/projects/tasks/${userId}`}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    My Tasks
                  </CardTitle>
                  <CoinsIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-medium">{usersTasks}</div>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
        {invoiceModule?.enabled && (
          <Link href="/invoice">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                <CoinsIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium">{invoices}</div>
              </CardContent>
            </Card>
          </Link>
        )}
        {documentsModule?.enabled && (
          <Link href="/documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <CoinsIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-medium">{documents}</div>
              </CardContent>
            </Card>
          </Link>
        )}

        <StorageQuota actual={storage} />
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
