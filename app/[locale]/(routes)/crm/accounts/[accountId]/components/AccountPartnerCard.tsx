"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setAccountPartner } from "@/actions/crm/accounts/set-account-partner";

type Props = {
  accountId: string;
  partnerUserId: string | null;
  partners: { id: string; name: string | null; email: string }[];
};

const NONE = "none";

/** Rendered for admins and managers only (the page decides); the action re-checks the role. */
const AccountPartnerCard = ({ accountId, partnerUserId, partners }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onChange = async (value: string) => {
    setBusy(true);
    try {
      const res = await setAccountPartner(accountId, value === NONE ? null : value);
      if (res.error) toast.error(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Partner</CardTitle>
        <Select value={partnerUserId ?? NONE} onValueChange={onChange} disabled={busy}>
          <SelectTrigger className="w-64" aria-label="Partner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No partner</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name ?? p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        The external partner who looks after this account. The internal owner stays as it is.
      </CardContent>
    </Card>
  );
};

export default AccountPartnerCard;
