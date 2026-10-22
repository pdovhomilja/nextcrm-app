import { getSessionAnyStatus } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { HeaderLive } from "./components/HeaderLive";
import Footer from "./components/Footer";

import { Metadata } from "next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { getLocale, getTranslations } from "next-intl/server";
import { mapLegacyRole, toPluginRole } from "@/lib/authz/roles";
import { getUserPermissions } from "@/lib/authz/feature-access";
import { permissionsForCrmAccess } from "@/lib/vensai/crm-nav";
import { AvatarProvider } from "@/context/avatar-context";
import { CurrencyProvider } from "@/context/currency-context";
import {
  getCachedDefaultCurrency,
  getCachedEnabledCurrencies,
  getCachedPluginNav,
  getCachedUserAccessProfile,
} from "@/lib/server/cached-platform";
import { getAppName } from "@/lib/app-name";

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
  const session = await getSessionAnyStatus();

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

  if ((user as { mustChangePassword?: boolean }).mustChangePassword) {
    return redirect("/change-password");
  }

  const userId = session.user.id as string;
  const role = mapLegacyRole(user?.role);
  const locale = (await getLocale()) as "en" | "cz" | "de" | "uk";

  const [dict, cookieStore, enabledCurrencies, defaultCurrency, permissions, accessProfile, pluginNav] =
    await Promise.all([
      getTranslations("ModuleMenu"),
      cookies(),
      getCachedEnabledCurrencies(),
      getCachedDefaultCurrency(),
      getUserPermissions(userId, session.user.role),
      getCachedUserAccessProfile(userId),
      getCachedPluginNav(toPluginRole(role), locale),
    ]);

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
      products: dict("crm.products"),
      priceLists: dict("crm.priceLists"),
      orders: dict("crm.orders"),
      targets: dict("crm.targets"),
      targetLists: dict("crm.targetLists"),
    },
    projects: dict("projects"),
    emails: dict("emails"),
    reports: dict("reports"),
    documents: dict("documents"),
    invoices: dict("invoices"),
    settings: dict("settings"),
    plugins: dict("plugins"),
  };

  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const cookieCurrency = cookieStore.get("display_currency")?.value;
  const displayCurrency = cookieCurrency && enabledCurrencies.some((c: { code: string }) => c.code === cookieCurrency)
    ? cookieCurrency
    : defaultCurrency;
  const currencyList = enabledCurrencies.map((c: { code: string; name: string; symbol: string }) => ({ code: c.code, name: c.name, symbol: c.symbol }));

  const effectivePermissions = permissionsForCrmAccess(
    permissions,
    accessProfile?.crmEnabled !== false,
  );
  const showVenturesNav = (accessProfile?.ventureGrants.length ?? 0) > 0;

  //console.log(typeof build, "build");
  return (
    <AvatarProvider initialAvatar={user?.image}>
    <CurrencyProvider initialCurrency={displayCurrency} currencies={currencyList}>
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        dict={translations}
        session={session}
        pluginNav={pluginNav}
        appName={getAppName()}
        permissions={effectivePermissions}
        showVenturesNav={showVenturesNav}
      />
      <SidebarInset>
        <HeaderLive
          user={{
            id: session.user.id as string,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
          }}
          initialLive={{
            emailUnreadCount: 0,
            chatUnreadCount: 0,
            notificationCount: 0,
            items: [],
            at: null,
          }}
        />
        {/*
          Task Group 3.3: Footer Relocation
          - Footer has been moved inside the scrollable content area
          - This allows the footer to scroll with the page content
          - Footer will appear at the bottom of the content, not fixed at viewport bottom
        */}
        <div className="app-main-scroll">
          <div className="app-content-wrap">{children}</div>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
    </CurrencyProvider>
    </AvatarProvider>
  );
}
