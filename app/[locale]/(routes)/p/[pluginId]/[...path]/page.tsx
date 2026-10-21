import { notFound, redirect } from "next/navigation";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { toPluginRole } from "@/lib/authz/roles";
import { findPluginPage } from "@/lib/plugins/slots";
import { PluginSlot } from "@/lib/plugins/ui/PluginSlot";

export default async function PluginPage(props: {
  params: Promise<{ pluginId: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let user;
  try { user = await requireAuthenticated(); } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    throw e;
  }
  const { pluginId, path } = await props.params;
  const searchParams = await props.searchParams;
  const pluginRole = toPluginRole(user.role);
  const found = await findPluginPage(pluginId, path, pluginRole);
  if (!found) notFound();
  return (
    <div className="p-4">
      <PluginSlot plugin={found.plugin} actor={{ type: "user", userId: user.id, role: pluginRole }}
        render={(ctx) => found.page.component({ path, searchParams, ctx })} />
    </div>
  );
}
