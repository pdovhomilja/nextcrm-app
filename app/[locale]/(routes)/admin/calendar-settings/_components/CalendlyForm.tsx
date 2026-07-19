"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCalendlyAction, subscribeCalendlyWebhook } from "../_actions/calendly";

export function CalendlyForm(props: {
  hasToken: boolean;
  hasSigningKey: boolean;
  webhookUri: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="max-w-xl space-y-4 rounded-lg border p-4">
      <form action={saveCalendlyAction} className="space-y-3">
        <div>
          <label className="text-sm font-medium">
            API token {props.hasToken ? "(saved)" : ""}
          </label>
          <Input name="apiToken" type="password" placeholder="Calendly personal access token" />
        </div>
        <div>
          <label className="text-sm font-medium">
            Webhook signing key {props.hasSigningKey ? "(saved)" : ""}
          </label>
          <Input name="signingKey" type="password" placeholder="Webhook signing key" />
        </div>
        <Button type="submit">Save</Button>
      </form>

      <div className="border-t pt-4">
        <Button
          variant="secondary"
          disabled={pending || !props.hasToken}
          onClick={() =>
            startTransition(async () => {
              const res = await subscribeCalendlyWebhook();
              setMessage(res.ok ? "Webhook subscribed." : res.error ?? "Failed.");
            })
          }
        >
          {props.webhookUri ? "Re-subscribe webhook" : "Subscribe webhook"}
        </Button>
        {props.webhookUri && (
          <p className="mt-2 break-all text-xs text-muted-foreground">
            Active subscription: {props.webhookUri}
          </p>
        )}
        {message && <p className="mt-2 text-sm">{message}</p>}
      </div>
    </div>
  );
}
