"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AlertModal from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeOrderStatus, decideOrderApproval, deleteOrder, submitOrder } from "@/actions/crm/orders/orders";
import type { OrderDetail } from "@/actions/crm/orders/queries";

type Confirm = null | "delete" | "cancel" | "reject";

export function OrderActions({ order }: { order: OrderDetail }) {
  const t = useTranslations("OrdersPage");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [note, setNote] = useState("");
  const [to, setTo] = useState<string>(order.nextStatuses?.[0] ?? "");
  const allowed = new Set(order.allowedActions ?? []);
  const done = (res: { error: string } | { data: unknown }, after?: () => void) => {
    if ("error" in res) { toast.error(res.error.startsWith("pricing:") ? res.error.slice(8) : t(`error.${res.error}` as never)); return; }
    after ? after() : router.refresh();
  };
  const act = (fn: () => Promise<{ error: string } | { data: unknown }>, after?: () => void) => start(async () => { done(await fn(), after); setConfirm(null); });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <AlertModal isOpen={!!confirm} loading={pending} onClose={() => setConfirm(null)}
        onConfirm={() => confirm === "delete"
          ? act(() => deleteOrder(order.id), () => router.push("/crm/orders"))
          : confirm === "reject"
            ? act(() => decideOrderApproval(order.id, "REJECTED", note))
            : act(() => changeOrderStatus(order.id, "cancel"))} />
      {allowed.has("submit") && <Button disabled={pending} onClick={() => act(() => submitOrder(order.id))}>{t("submit")}</Button>}
      {allowed.has("approve") && (
        <>
          <Input className="w-64" placeholder={t("rejectNote")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button disabled={pending} onClick={() => act(() => decideOrderApproval(order.id, "APPROVED", note))}>{t("approve")}</Button>
          <Button disabled={pending} variant="destructive" onClick={() => setConfirm("reject")}>{t("reject")}</Button>
        </>
      )}
      {allowed.has("withdraw") && <Button disabled={pending} variant="outline" onClick={() => act(() => changeOrderStatus(order.id, "withdraw"))}>{t("withdraw")}</Button>}
      {allowed.has("reopen") && <Button disabled={pending} variant="outline" onClick={() => act(() => changeOrderStatus(order.id, "reopen"))}>{t("reopen")}</Button>}
      {allowed.has("retry") && <Button disabled={pending} onClick={() => act(() => changeOrderStatus(order.id, "retry"))}>{t("retry")}</Button>}
      {allowed.has("advance") && (
        <>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{(order.nextStatuses ?? []).map((s) => <SelectItem key={s} value={s}>{t(`status${s}` as never)}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={pending || !to} variant="outline" onClick={() => act(() => changeOrderStatus(order.id, "advance", to as never))}>{t("advance")}</Button>
        </>
      )}
      {allowed.has("cancel") && <Button disabled={pending} variant="outline" onClick={() => setConfirm("cancel")}>{t("cancel")}</Button>}
      {allowed.has("delete") && <Button disabled={pending} variant="outline" onClick={() => setConfirm("delete")}>{t("delete")}</Button>}
    </div>
  );
}
