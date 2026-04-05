"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useRouter } from "next/navigation";

import { useAction } from "@/hooks/use-action";

import { updateContract } from "@/actions/crm/contracts/update-contract";

import FormSheetNoTrigger from "@/components/sheets/form-sheet-no-trigger";

import { FormInput } from "@/components/form/form-input";

import { FormSubmit } from "@/components/form/form-submit";
import { FormDatePicker } from "@/components/form/form-datepicker";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { getAccounts } from "@/actions/crm/accounts/get-accounts";
import { getEnabledCurrencies } from "@/lib/currency";

const UpdateContractForm = ({
  onOpen,
  setOpen,
  data,
}: {
  onOpen: boolean;
  setOpen: (open: boolean) => void;
  data: any;
}) => {
  const router = useRouter();
  const [assignedTo, setAssignedTo] = useState<string>(data.assigned_to ?? "");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [currencies, setCurrencies] = useState<{ code: string; name: string; symbol: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([getAccounts(), getEnabledCurrencies()])
      .then(([accountsData, currenciesData]) => {
        setAccounts(
          (accountsData ?? []).map((a: any) => ({ id: a.id, name: a.name }))
        );
        setCurrencies(
          (currenciesData ?? []).map((c: any) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
          }))
        );
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  const contractStatuses = [
    { id: "NOTSTARTED", name: "Not started" },
    { id: "INPROGRESS", name: "In progress" },
    { id: "SIGNED", name: "Signed" },
  ];

  const valueString = data && data.value ? data.value.toString() : "";

  const { execute, fieldErrors, isLoading } = useAction(updateContract, {
    onSuccess: () => {
      toast.success("Contract updated successfully!");
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
    const currency = formData.get("currency") as string;

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
      currency,
    });
  };

  return (
    <FormSheetNoTrigger
      title="Update contract"
      description="Update contract details, dates, status, and assignments"
      open={onOpen}
      setOpen={setOpen}
    >
      {isLoadingData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
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
          <FormSelect
            id="currency"
            label="Currency"
            type="hidden"
            data={currencies.map((c) => ({
              id: c.code,
              name: `${c.symbol} ${c.code} — ${c.name}`,
            }))}
            errors={fieldErrors}
            defaultValue={data.currency ?? ""}
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700">
              Assigned To
            </label>
            <UserSearchCombobox
              value={assignedTo}
              onChange={setAssignedTo}
              placeholder="Select assigned user"
              name="assigned_to"
            />
          </div>
          <FormSubmit className="w-full">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              "Update"
            )}
          </FormSubmit>
        </form>
      )}
    </FormSheetNoTrigger>
  );
};

export default UpdateContractForm;
