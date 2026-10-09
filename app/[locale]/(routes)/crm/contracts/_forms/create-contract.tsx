"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ElementRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { crm_Accounts } from "@prisma/client";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";

import { useAction } from "@/hooks/use-action";

import { createNewContract } from "@/actions/crm/contracts/create-new-contract";

import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormDatePicker } from "@/components/form/form-datepicker";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";
import { useSession } from "@/lib/auth-client";

const CreateContractForm = ({
  accounts,
  accountId,
  currencies = [],
}: {
  accounts: crm_Accounts[];
  accountId: string;
  currencies?: { code: string; name: string; symbol: string }[];
}) => {
  const router = useRouter();
  const closeRef = useRef<ElementRef<"button">>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const { data: session } = useSession();
  const t = useTranslations("CrmContractForm");
  const c = useTranslations("Common");

  useEffect(() => {
    const uid = session?.user?.id;
    if (uid) setAssignedTo((prev) => prev || uid);
  }, [session]);

  //console.log(accountId, "accountId");

  const { execute, fieldErrors, isLoading } = useAction(createNewContract, {
    onSuccess: (data) => {
      toast.success(t("createSuccess"));
      closeRef.current?.click();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const contractTypes = [
    { id: "Service Agreement", name: "Service Agreement" },
    { id: "Supply Contract", name: "Supply Contract" },
    { id: "NDA", name: "NDA (Non-Disclosure Agreement)" },
    { id: "Partnership Agreement", name: "Partnership Agreement" },
    { id: "SLA", name: "Service Level Agreement (SLA)" },
    { id: "Licensing Agreement", name: "Licensing Agreement" },
  ];

  const onAction = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const value = formData.get("value") as string;
    const type = formData.get("type") as string;
    const rawStartDate = formData.get("startDate") as string;
    const rawEndDate = formData.get("endDate") as string;
    const rawRenewalDate = formData.get("renewalReminderDate") as string;
    const rawCustomerSignedDate = formData.get("customerSignedDate") as string;
    const rawCompanySignedDate = formData.get("companySignedDate") as string;

    const startDate = rawStartDate ? new Date(rawStartDate) : undefined;
    const endDate = rawEndDate ? new Date(rawEndDate) : undefined;
    const renewalReminderDate = rawRenewalDate ? new Date(rawRenewalDate) : undefined;
    const customerSignedDate = rawCustomerSignedDate ? new Date(rawCustomerSignedDate) : undefined;
    const companySignedDate = rawCompanySignedDate ? new Date(rawCompanySignedDate) : undefined;
    const description = formData.get("description") as string;
    const account = formData.get("account") as string;
    const assigned_to = formData.get("assigned_to") as string;
    const currency = formData.get("currency") as string;

    await execute({
      title,
      value,
      type,
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
      renewalReminderDate: renewalReminderDate && !isNaN(renewalReminderDate.getTime()) ? renewalReminderDate : undefined,
      customerSignedDate: customerSignedDate && !isNaN(customerSignedDate.getTime()) ? customerSignedDate : undefined,
      companySignedDate: companySignedDate && !isNaN(companySignedDate.getTime()) ? companySignedDate : undefined,
      description,
      account,
      assigned_to,
      currency,
    });
  };

  return (
    <FormSheet
      trigger={"+"}
      title={t("createButton")}
      description="Create a new contract with specified terms, dates, and assigned users"
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        <FormInput id="title" label={t("title")} type="text" errors={fieldErrors} />
        <FormInput id="value" label={t("value")} type="text" errors={fieldErrors} />
        <FormSelect
          id="type"
          label="Contract Type"
          type="hidden"
          placeholder="Select contract type"
          data={contractTypes}
          errors={fieldErrors}
        />
        <FormSelect
          id="currency"
          label={t("currency")}
          type="hidden"
          placeholder="Select currency"
          data={currencies.map((c) => ({ id: c.code, name: `${c.symbol} ${c.code} — ${c.name}` }))}
          errors={fieldErrors}
        />
        <FormDatePicker
          id="startDate"
          label={t("startDate")}
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="endDate"
          label={t("endDate")}
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="renewalReminderDate"
          label={t("renewalReminderDate")}
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="customerSignedDate"
          label={t("customerSignedDate")}
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="companySignedDate"
          label={t("companySignedDate")}
          type="hidden"
          errors={fieldErrors}
        />
        <FormTextarea
          id="description"
          label={c("description")}
          errors={fieldErrors}
        />
        <FormSelect
          id="account"
          label={t("account")}
          type="hidden"
          placeholder="Select an account"
          data={(accounts || []).map((a) => ({ id: a.id, name: a.name }))}
          errors={fieldErrors}
          defaultValue={accountId}
          disabled={!!accountId}
        />
        <div className="space-y-1">
          <label className="text-sm font-medium">{c("assignedTo")}</label>
          <UserSearchCombobox
            value={assignedTo}
            onChange={setAssignedTo}
            placeholder={c("selectUser")}
            disabled={isLoading}
            name="assigned_to"
          />
        </div>
        <FormSubmit className="w-full">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            c("create")
          )}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default CreateContractForm;

