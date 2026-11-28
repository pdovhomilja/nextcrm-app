"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runPluginPageActionAction } from "../_actions/page-actions";

export function PluginPageActionButton({ pluginId, action, input, label }: { pluginId: string; action: string; input: Record<string, string>; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () => start(async () => {
    const res = await runPluginPageActionAction(pluginId, action, input);
    if (!res.ok) { toast.error(res.error ?? "Error"); return; }
    if (res.message) toast.success(res.message);
    router.refresh();
  });
  return <Button size="sm" variant="outline" disabled={pending} onClick={run}>{label}</Button>;
}
