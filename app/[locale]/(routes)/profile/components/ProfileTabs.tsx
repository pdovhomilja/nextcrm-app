// app/[locale]/(routes)/profile/components/ProfileTabs.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { UserCircle, Lock, Globe, Code2, Mail } from "lucide-react";

// Do NOT import tab content components here — they are Server Components
// and must be passed as ReactNode props from page.tsx

type Tab = "profile" | "security" | "preferences" | "developer" | "emails";

const TAB_ICONS: Record<Tab, React.ElementType> = {
  profile: UserCircle,
  security: Lock,
  preferences: Globe,
  developer: Code2,
  emails: Mail,
};

type Props = {
  profileContent: React.ReactNode;
  securityContent: React.ReactNode;
  preferencesContent: React.ReactNode;
  developerContent: React.ReactNode;
  emailsContent: React.ReactNode;
};

export function ProfileTabs({
  profileContent,
  securityContent,
  preferencesContent,
  developerContent,
  emailsContent,
}: Props) {
  const t = useTranslations("ProfilePage");
  const router = useRouter();
  const searchParams = useSearchParams();

  const TAB_IDS: Tab[] = ["profile", "security", "preferences", "developer", "emails"];
  const raw = searchParams.get("tab");
  const activeTab: Tab = TAB_IDS.includes(raw as Tab) ? (raw as Tab) : "profile";

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: "profile", label: t("tabs.profile"), desc: t("tabs.profileDesc") },
    { id: "security", label: t("tabs.security"), desc: t("tabs.securityDesc") },
    { id: "preferences", label: t("tabs.preferences"), desc: t("tabs.preferencesDesc") },
    { id: "developer", label: t("tabs.developer"), desc: t("tabs.developerDesc") },
    { id: "emails", label: "Email Accounts", desc: "Manage your connected IMAP mailboxes" },
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  const contentMap: Record<Tab, React.ReactNode> = {
    profile: profileContent,
    security: securityContent,
    preferences: preferencesContent,
    developer: developerContent,
    emails: emailsContent,
  };

  return (
    <div className="flex min-h-[480px]">
      {/* Sidebar nav — hidden on mobile, shown md+ */}
      <nav className="hidden md:flex w-48 flex-col flex-shrink-0 border-r border-border p-3 gap-1">
        {tabs.map(({ id, label }) => {
          const Icon = TAB_ICONS[id];
          return (
            <button
              key={id}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("tab", id);
                router.replace(`?${params.toString()}`, { scroll: false });
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors",
                activeTab === id
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {/* Mobile horizontal scroll tabs */}
        <div className="flex md:hidden gap-1 mb-5 overflow-x-auto pb-1 border-b border-border">
          {tabs.map(({ id, label }) => {
            const Icon = TAB_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("tab", id);
                  router.replace(`?${params.toString()}`, { scroll: false });
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
                  activeTab === id
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab heading */}
        <div className="mb-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {activeTabMeta.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTabMeta.desc}
          </p>
        </div>

        {contentMap[activeTab]}
      </div>
    </div>
  );
}
