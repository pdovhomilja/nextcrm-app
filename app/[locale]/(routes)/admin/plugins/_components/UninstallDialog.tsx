"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { uninstallPluginAction } from "../_actions/plugins";

export function UninstallDialog(props: { pluginId: string; name: string; entries: number; records: number }) {
  const t = useTranslations("Plugins.admin");
  const router = useRouter();
  const [pending, start] = useTransition();
  const confirm = () => start(async () => {
    const res = await uninstallPluginAction(props.pluginId);
    if (res.ok) router.push("/admin/plugins"); else toast.error(res.error ?? "Error");
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive">{t("uninstall")}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("uninstallTitle", { name: props.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("uninstallBody", { entries: props.entries, records: props.records })}</AlertDialogDescription>
        </AlertDialogHeader>
        <a className="text-sm underline" href={`/api/admin/plugins/${props.pluginId}/export`}>{t("export")}</a>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={confirm}>{t("confirmUninstall")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
