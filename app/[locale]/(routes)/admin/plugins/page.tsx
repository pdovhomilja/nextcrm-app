import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPluginsForAdmin } from "@/lib/plugins/state";

const STATUS_KEY = { NOT_INSTALLED: "notInstalled", ENABLED: "enabled", DISABLED: "disabled", MISSING: "missing" } as const;

export default async function PluginsPage() {
  const t = await getTranslations("Plugins.admin");
  const plugins = await listPluginsForAdmin();
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {plugins.map((p) => (
          <Link key={p.id} href={`/admin/plugins/${p.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50 px-2 rounded">
            <div className="min-w-0">
              <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">{p.version ?? p.installedVersion}</span></p>
              <p className="text-sm text-muted-foreground truncate">{p.description}</p>
            </div>
            <Badge variant={p.status === "ENABLED" ? "default" : "secondary"}>{t(STATUS_KEY[p.status])}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
