"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { InviteForm } from "./IviteForm";
import { BulkCreateDialog } from "./BulkCreateDialog";
import { BulkEditDialog } from "./BulkEditDialog";
import SendMailToAll from "./send-mail-to-all";
import { AdminUserDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import type { AdminUser } from "../table-data/schema";
import type { VentureOption } from "@/lib/vensai/venture-catalog";

export function UsersAdmin({
  users,
  orgDomain,
  inviteHeading,
  ventureOptions,
}: {
  users: AdminUser[];
  orgDomain: string;
  inviteHeading: string;
  ventureOptions: VentureOption[];
}) {
  const [selected, setSelected] = useState<AdminUser[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <BulkEditDialog selected={selected} />
        <BulkCreateDialog orgDomain={orgDomain} />
      </div>
      <div>
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">{inviteHeading}</h4>
        <div className="mt-4">
          <InviteForm orgDomain={orgDomain} ventureOptions={ventureOptions} />
        </div>
      </div>
      <Separator />
      <SendMailToAll />
      <Separator />
      <AdminUserDataTable
        columns={columns}
        data={users}
        ventureOptions={ventureOptions}
        onSelectedChange={setSelected}
      />
    </div>
  );
}
