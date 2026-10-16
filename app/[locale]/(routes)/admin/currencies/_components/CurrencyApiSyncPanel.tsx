"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  syncExchangeRatesFromCurrencyApiAction,
  syncGlobalCurrenciesAction,
  syncExchangeRatesFromFrankfurter,
} from "@/actions/admin/sync-exchange-rates";
import { saveCurrencyApiKey } from "../_actions/currencies";
import { RefreshCw, Key, CheckCircle2, Globe, Zap, ShieldCheck } from "lucide-react";

interface CurrencyApiSyncPanelProps {
  apiInfo: {
    hasKey: boolean;
    maskedKey: string;
    status: {
      plan?: string;
      status?: string;
      quotaTotal: number;
      quotaUsed: number;
      quotaRemaining: number;
    } | null;
  };
}

export function CurrencyApiSyncPanel({ apiInfo }: { apiInfo: CurrencyApiSyncPanelProps["apiInfo"] }) {
  const [isPending, startTransition] = useTransition();
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");

  const handleSyncRates = () => {
    startTransition(async () => {
      try {
        const res = await syncExchangeRatesFromCurrencyApiAction();
        if (!res.ok) {
          toast.error(res.error || "CurrencyAPI sync failed");
          return;
        }
        toast.success(`Successfully updated ${res.updated} exchange rates from CurrencyAPI (base: ${res.base || "USD"})`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to sync exchange rates");
      }
    });
  };

  const handleSyncCurrencies = () => {
    startTransition(async () => {
      try {
        const res = await syncGlobalCurrenciesAction();
        if (!res.ok) {
          toast.error(res.error || "Currency sync failed");
          return;
        }
        toast.success(`Synced ${res.total} global currencies (${res.added} added, ${res.updated} refreshed)`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to sync currencies catalog");
      }
    });
  };

  const handleSyncFrankfurter = () => {
    startTransition(async () => {
      try {
        const res = await syncExchangeRatesFromFrankfurter();
        if (!res.ok) {
          toast.error(res.error || "Frankfurter sync failed");
          return;
        }
        toast.success(
          `Updated ${res.updated} rates from Frankfurter across supported ECB currencies`
        );
      } catch (err: any) {
        toast.error(err?.message || "Sync failed");
      }
    });
  };

  const handleSaveKey = () => {
    if (!newKey.trim()) return;
    startTransition(async () => {
      try {
        await saveCurrencyApiKey(newKey);
        toast.success("CurrencyAPI key updated");
        setKeyModalOpen(false);
        setNewKey("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to save API key");
      }
    });
  };

  const quota = apiInfo?.status;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">CurrencyAPI Live Engine</span>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            <ShieldCheck className="mr-1 h-3 w-3 inline text-emerald-600" />
            Connected
          </Badge>
          {quota && (
            <Badge variant="secondary" className="text-xs font-mono">
              Quota: {quota.quotaRemaining} / {quota.quotaTotal} left
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Real-time institutional FX rates and catalog of 171 world fiat currencies powered by CurrencyAPI.
          {apiInfo.maskedKey && (
            <span className="ml-1 text-muted-foreground/80 font-mono">
              Key: {apiInfo.maskedKey}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={handleSyncRates}
          className="text-xs h-8 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          Sync FX Rates
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleSyncCurrencies}
          className="text-xs h-8 gap-1.5"
        >
          <Globe className="h-3.5 w-3.5" />
          Refresh 171 Currencies
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleSyncFrankfurter}
          className="text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          Frankfurter (30 currencies)
        </Button>

        <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1"
            >
              <Key className="h-3 w-3" />
              API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure CurrencyAPI Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Enter your CurrencyAPI live API token. This token will be securely stored in system settings and used for live FX quotes and global currency updates.
              </p>
              <Input
                placeholder="cur_live_..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                onClick={handleSaveKey}
                disabled={isPending || !newKey.trim()}
                className="w-full text-xs"
              >
                Save API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
