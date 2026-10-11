import { EmailSendProvider } from "@prisma/client";
import type { getAdminEmailAccounts } from "@/actions/admin/email-accounts";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Radio, Zap } from "lucide-react";

type Account = Awaited<ReturnType<typeof getAdminEmailAccounts>>[number];

export function EmailMailboxStats({ accounts }: { accounts: Account[] }) {
  const active = accounts.filter((a) => a.isActive).length;
  const resend = accounts.filter((a) => a.sendProvider === EmailSendProvider.RESEND).length;

  const items = [
    { label: "Total mailboxes", value: accounts.length, icon: Mail },
    { label: "Active", value: active, icon: Radio },
    { label: "Resend mailboxes", value: resend, icon: Zap },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
