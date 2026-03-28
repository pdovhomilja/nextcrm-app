"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AuditAdminTable } from "./AdminTable";
import { restoreAccount } from "@/actions/crm/accounts/restore-account";
import { restoreContact } from "@/actions/crm/contacts/restore-contact";
import { restoreLead } from "@/actions/crm/leads/restore-lead";
import { restoreOpportunity } from "@/actions/crm/opportunities/restore-opportunity";
import { restoreContract } from "@/actions/crm/contracts/restore-contract";

// Pass the same props as AuditAdminTable (minus onRestore which we provide internally)
type Props = Omit<React.ComponentProps<typeof AuditAdminTable>, "onRestore">;

export function AdminAuditLogClient(props: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleRestore = (entityType: string, entityId: string) => {
    startTransition(async () => {
      let result: { error?: string; success?: boolean };
      switch (entityType) {
        case "account":
          result = await restoreAccount(entityId);
          break;
        case "contact":
          result = await restoreContact(entityId);
          break;
        case "lead":
          result = await restoreLead(entityId);
          break;
        case "opportunity":
          result = await restoreOpportunity(entityId);
          break;
        case "contract":
          result = await restoreContract(entityId);
          break;
        default:
          result = { error: "Unknown entity type" };
      }
      if (result.error) {
        console.error("[RESTORE]", result.error);
      } else {
        router.refresh();
      }
    });
  };

  return <AuditAdminTable {...props} onRestore={handleRestore} />;
}
