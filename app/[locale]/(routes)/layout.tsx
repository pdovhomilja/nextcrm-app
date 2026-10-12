import { getSessionAnyStatus } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { HeaderLive } from "./components/HeaderLive";
import { EmailsLiveRefresh } from "./components/EmailsLiveRefresh";
import Footer from "./components/Footer";

import { Metadata } from "next";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { getTranslations } from "next-intl/server";
import { AvatarProvider } from "@/context/avatar-context";
import { CurrencyProvider } from "@/context/currency-context";
import { getEnabledCurrencies, getDefaultCurrency } from "@/lib/currency";
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

  // Parallelize layout data fetching to eliminate waterfall delay
  const [dict, cookieStore, enabledCurrencies, defaultCurrency] = await Promise.all([
    getTranslations("ModuleMenu"),
    cookies(),
    getEnabledCurrencies(),
    getDefaultCurrency(),
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

  const { getPluginNavItems } = await import("@/lib/plugins/nav");
  const { mapLegacyRole } = await import("@/lib/authz/roles");
  const { getLocale } = await import("next-intl/server");
  const pluginNav = await getPluginNavItems(mapLegacyRole(user?.role), (await getLocale()) as "en" | "cz" | "de" | "uk");
  const { getHeaderNotifications } = await import("@/actions/notifications/header-notifications");
  const { getChatUnreadCount } = await import("@/actions/chat/unread");
  const { getUserPermissions } = await import("@/lib/authz/feature-access");
  const [headerNotifications, chatUnreadCount, permissions] = await Promise.all([
    getHeaderNotifications(),
    getChatUnreadCount(),
    getUserPermissions(session.user.id as string, session.user.role),
  ]);

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
        permissions={permissions}
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
            emailUnreadCount: headerNotifications.emailUnreadCount,
            chatUnreadCount,
            notificationCount: headerNotifications.totalCount,
            items: headerNotifications.items,
            at: new Date().toISOString(),
          }}
        />
        <EmailsLiveRefresh />
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
