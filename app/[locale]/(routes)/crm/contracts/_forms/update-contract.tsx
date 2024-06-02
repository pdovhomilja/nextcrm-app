"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useRouter } from "next/navigation";

import { crm_Accounts, Users } from "@prisma/client";

import { useAction } from "@/hooks/use-action";

import { updateContract } from "@/actions/crm/contracts/update-contract";

import FormSheetNoTrigger from "@/components/sheets/form-sheet-no-trigger";

import { FormInput } from "@/components/form/form-input";

import { FormSubmit } from "@/components/form/form-submit";
import { FormDatePicker } from "@/components/form/form-datepicker";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";

const UpdateContractForm = ({
  onOpen,
  setOpen,
  users,
  accounts,
  data,
}: {
  onOpen: boolean;
  setOpen: (open: boolean) => void;
  users: Users[];
  accounts: crm_Accounts[];
  //TODO: fix type for data
  data: any;
}) => {
  const router = useRouter();

  const contractStatuses = [
    { id: "NOTSTARTED", name: "Not started" },
    { id: "INPROGRESS", name: "In progress" },
    { id: "SIGNED", name: "Signed" },
  ];

  const valueString = data && data.value ? data.value.toString() : "";

  //console.log("Data", data);

  const { execute, fieldErrors, isLoading } = useAction(updateContract, {
    onSuccess: (data) => {
      toast.success("Contract updated successfully!");
      //closeRef.current?.click();
      setOpen(false);
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
    const status = formData.get("status") as any;
    const account = formData.get("account") as string;
    const assigned_to = formData.get("assigned_to") as string;

    await execute({
      id: data.id,
      v: data.v,
      title,
      value,
      startDate,
      endDate,
      renewalReminderDate,
      customerSignedDate,
      companySignedDate,
      description,
      status,
      account,
      assigned_to,
    });
  };

  isLoading ? <Loader2 className="h-6 w-6  animate-spin" /> : null;

  return (
    <FormSheetNoTrigger
      title="Update contract"
      description=""
      open={onOpen}
      setOpen={setOpen}
    >
      <form action={onAction} className="space-y-4">
        <FormInput
          id="title"
          label="Title"
          type="text"
          errors={fieldErrors}
          defaultValue={data.title}
        />
        <FormInput
          id="value"
          label="Value"
          type="text"
          errors={fieldErrors}
          defaultValue={valueString}
        />
        <FormDatePicker
          id="startDate"
          label="Start Date"
          type="hidden"
          errors={fieldErrors}
          defaultValue={data.startDate}
        />
        <FormDatePicker
          id="endDate"
          label="End Date"
          type="hidden"
          errors={fieldErrors}
          defaultValue={data.endDate}
        />
        <FormDatePicker
          id="renewalReminderDate"
          label="Renewal Reminder Date"
          type="hidden"
          errors={fieldErrors}
          defaultValue={data.renewalReminderDate}
        />
        <FormDatePicker
          id="customerSignedDate"
          label="Customer Signed Date"
          type="hidden"
          errors={fieldErrors}
          defaultValue={data.customerSignedDate}
        />
        <FormDatePicker
          id="companySignedDate"
          label="Company Signed Date"
          type="hidden"
          errors={fieldErrors}
          defaultValue={data.companySignedDate}
        />
        <FormTextarea
          id="description"
          label="Description"
          errors={fieldErrors}
          defaultValue={data.description}
        />
        <FormSelect
          id="status"
          label="Status"
          type="hidden"
          data={contractStatuses}
          errors={fieldErrors}
          defaultValue={data.status}
        />
        <FormSelect
          id="account"
          label="Account"
          type="hidden"
          data={accounts}
          errors={fieldErrors}
          defaultValue={data.account}
        />
        <FormSelect
          id="assigned_to"
          label="Assigned To"
          type="hidden"
          data={users}
          errors={fieldErrors}
          defaultValue={data.assigned_to}
        />
        <FormSubmit className="w-full">
          {isLoading ? <Loader2 className="h-6 w-6  animate-spin" /> : "Update"}
        </FormSubmit>
      </form>
    </FormSheetNoTrigger>
  );
};

export default UpdateContractForm;
