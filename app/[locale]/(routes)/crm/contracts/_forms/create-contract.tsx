"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ElementRef, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { crm_Accounts, Users } from "@prisma/client";

import { useAction } from "@/hooks/use-action";

import { createNewContract } from "@/actions/crm/contracts/create-new-contract";

import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormDatePicker } from "@/components/form/form-datepicker";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";

const CreateContractForm = ({
  users,
  accounts,
  accountId,
}: {
  users: Users[];
  accounts: crm_Accounts[];
  accountId: string;
}) => {
  const router = useRouter();
  const closeRef = useRef<ElementRef<"button">>(null);

  //console.log(accountId, "accountId");

  const { execute, fieldErrors, isLoading } = useAction(createNewContract, {
    onSuccess: (data) => {
      toast.success("New contract created successfully!");
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
      title="Create new contract"
      description=""
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        <FormInput id="title" label="Title" type="text" errors={fieldErrors} />
        <FormInput id="value" label="Value" type="text" errors={fieldErrors} />
        <FormDatePicker
          id="startDate"
          label="Start Date"
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="endDate"
          label="End Date"
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="renewalReminderDate"
          label="Renewal Reminder Date"
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="customerSignedDate"
          label="Customer Signed Date"
          type="hidden"
          errors={fieldErrors}
        />
        <FormDatePicker
          id="companySignedDate"
          label="Company Signed Date"
          type="hidden"
          errors={fieldErrors}
        />
        <FormTextarea
          id="description"
          label="Description"
          errors={fieldErrors}
        />
        <FormSelect
          id="account"
          label="Account"
          type="hidden"
          data={accounts}
          errors={fieldErrors}
          defaultValue={accountId}
        />
        <FormSelect
          id="assigned_to"
          label="Assigned To"
          type="hidden"
          data={users}
          errors={fieldErrors}
        />
        <FormSubmit className="w-full">
          {isLoading ? (
            <Loader2 className="h-6 w-6  animate-spin" />
          ) : (
            "Vytvořit"
          )}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default CreateContractForm;
