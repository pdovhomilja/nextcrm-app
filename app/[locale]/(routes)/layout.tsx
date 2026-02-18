import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import Header from "./components/Header";
import Footer from "./components/Footer";
import getAllCommits from "@/actions/github/get-repo-commits";
import { getModules } from "@/actions/get-modules";

import { Metadata } from "next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"
  ),
  title: "",
  description: "",
  openGraph: {
    images: [
      {
        url: "/images/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/images/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "",
      },
    ],
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  //console.log(session, "session");

  if (!session) {
    return redirect("/sign-in");
  }

  const user = session?.user;

  if (user?.userStatus === "PENDING") {
    return redirect("/pending");
  }

  if (user?.userStatus === "INACTIVE") {
    return redirect("/inactive");
  }

  const build = await getAllCommits();

  // Fetch modules data for sidebar
  const modules = await getModules();

  // Get user language for localization
  const lang = user?.userLanguage || "en";

  // Fetch localization dictionary
  const dict = await getTranslations("ModuleMenu");

  // Extract translations as plain object for client component
  const translations = {
    dashboard: dict("dashboard"),
    crm: {
      title: dict("crm.title"),
      accounts: dict("crm.accounts"),
      opportunities: dict("crm.opportunities"),
      contacts: dict("crm.contacts"),
      leads: dict("crm.leads"),
      contracts: dict("crm.contracts"),
    },
    projects: dict("projects"),
    emails: dict("emails"),
    invoices: dict("invoices"),
    reports: dict("reports"),
    documents: dict("documents"),
    settings: dict("settings"),
  };

  //console.log(typeof build, "build");
  return (
    <SidebarProvider>
      <AppSidebar
        modules={modules}
        dict={translations}
        build={build}
        session={session}
      />
      <SidebarInset>
        <Header
          id={session.user.id as string}
          lang={session.user.userLanguage as string}
        />
        {/*
          Task Group 3.3: Footer Relocation
          - Footer has been moved inside the scrollable content area
          - This allows the footer to scroll with the page content
          - Footer will appear at the bottom of the content, not fixed at viewport bottom
        */}
        <div className="flex flex-col flex-grow overflow-y-auto h-full">
          <div className="flex-grow p-5">{children}</div>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
