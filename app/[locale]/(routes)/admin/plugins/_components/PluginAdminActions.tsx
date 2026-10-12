"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runPluginAdminActionAction } from "../_actions/plugins";

export function PluginAdminActions({ pluginId, actions }: { pluginId: string; actions: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (id: string) => start(async () => {
    const res = await runPluginAdminActionAction(pluginId, id);
    if (!res.ok) { toast.error(res.error ?? "Error"); return; }
    if (res.message) toast.success(res.message);
    router.refresh();
  });
  return <>{actions.map((a) => <Button key={a.id} variant="outline" disabled={pending} onClick={() => run(a.id)}>{a.label}</Button>)}</>;
}
