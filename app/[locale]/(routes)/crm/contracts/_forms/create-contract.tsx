"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ElementRef, useRef, useState } from "react";
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

const CreateContractForm = ({
  accounts,
  accountId,
}: {
  accounts: crm_Accounts[];
  accountId: string;
}) => {
  const router = useRouter();
  const closeRef = useRef<ElementRef<"button">>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const t = useTranslations("CrmContractForm");
  const c = useTranslations("Common");

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

  const onAction = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const value = formData.get("value") as string;
    const startDate = new Date(formData.get("startDate") as string);
    const endDate = new Date(formData.get("endDate") as string);
    const renewalReminderDate = new Date(
      formData.get("renewalReminderDate") as string
    );
    const customerSignedDate = new Date(
      formData.get("customerSignedDate") as string
    );
    const companySignedDate = new Date(
      formData.get("companySignedDate") as string
    );
    const description = formData.get("description") as string;
    const account = formData.get("account") as string;
    const assigned_to = formData.get("assigned_to") as string;

    await execute({
      title,
      value,
      startDate,
      endDate,
      renewalReminderDate,
      customerSignedDate,
      companySignedDate,
      description,
      account,
      assigned_to,
    });
  };

  isLoading ? <Loader2 className="h-6 w-6  animate-spin" /> : null;

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
          data={accounts}
          errors={fieldErrors}
          defaultValue={accountId}
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
            <Loader2 className="h-6 w-6  animate-spin" />
          ) : (
            c("create")
          )}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default CreateContractForm;
