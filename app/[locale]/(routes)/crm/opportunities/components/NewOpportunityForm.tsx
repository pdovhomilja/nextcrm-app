"use client";

import { z } from "zod";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  crm_Accounts,
  crm_Contacts,
  crm_Opportunities_Sales_Stages,
  crm_Opportunities_Type,
  crm_campaigns,
} from "@prisma/client";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";

//TODO: fix all the types
type NewTaskFormProps = {
  accounts: crm_Accounts[];
  contacts: crm_Contacts[];
  salesType: crm_Opportunities_Type[];
  saleStages: crm_Opportunities_Sales_Stages[];
  campaigns: crm_campaigns[];
  currencies: { code: string; name: string; symbol: string }[];
  selectedStage?: string;
  accountId?: string;
  onDialogClose: () => void;
};

export function NewOpportunityForm({
  accounts,
  contacts,
  salesType,
  saleStages,
  campaigns,
  currencies,
  selectedStage,
  accountId,
  onDialogClose,
}: NewTaskFormProps) {
  const t = useTranslations("CrmOpportunityForm");
  const c = useTranslations("Common");

  const [searchAccountValue, setSearchAccountValue] = useState<string>("");
  const [searchContactValue, setSearchContactValue] = useState<string>("");

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        account.name.toLowerCase().includes(searchAccountValue.toLowerCase())
      ),
    [accounts, searchAccountValue]
  );

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          contact.last_name
            .toLowerCase()
            .includes(searchContactValue.toLowerCase()) ||
          (contact.first_name &&
            contact.first_name
              .toLowerCase()
              .includes(searchContactValue.toLowerCase()))
      ),
    [contacts, searchContactValue]
  );

  const formSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
    close_date: z.date({
      message: "A expected close date is required.",
    }),
    description: z.string(),
    type: z.string(),
    sales_stage: z.string(),
    budget: z.string(),
    currency: z.string(),
    expected_revenue: z.string(),
    next_step: z.string(),
    assigned_to: z.string(),
    account: z.string(),
    contact: z.string(),
    campaign: z.string(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      sales_stage: selectedStage ? selectedStage : "",
      account: accountId ? accountId : "",
      type: "",
      budget: "",
      currency: "",
      expected_revenue: "",
      next_step: "",
      assigned_to: "",
      contact: "",
      campaign: "",
      description: "",
      name: "",
    },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    const result = await createOpportunity(data);
    if (result?.error) {
      form.setError("root.serverError", { message: result.error || t("createError") });
    } else {
      toast.success(t("createSuccess"));
      form.reset({
        name: "",
        close_date: new Date(),
        description: "",
        type: "",
        sales_stage: "",
        budget: "",
        currency: "",
        expected_revenue: "",
        next_step: "",
        assigned_to: "",
        account: "",
        contact: "",
        campaign: "",
      });
      onDialogClose();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full h-full px-4 md:px-10"
      >
        <div className="w-full text-sm">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="New NextCRM functionality"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="close_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("closeDate")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("closeDatePlaceholder")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        //@ts-ignore
                        //TODO: fix this
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={form.formState.isSubmitting}
                      placeholder="New NextCRM functionality"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("salesType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("salesTypePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {salesType.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sales_stage"
                  render={({ field }) => (
                    <FormItem hidden={selectedStage ? true : false}>
                      <FormLabel>{t("saleStage")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={selectedStage}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("saleStagePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {saleStages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("budget")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={form.formState.isSubmitting}
                          placeholder="1000000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("currency")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectCurrency")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.code} — {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expected_revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("expectedRevenue")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={form.formState.isSubmitting}
                          placeholder="500000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="next_step"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nextStep")}</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={form.formState.isSubmitting}
                          placeholder={t("nextStepPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{c("assignedTo")}</FormLabel>
                      <FormControl>
                        <UserSearchCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder={c("selectUser")}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem hidden={accountId ? true : false}>
                      <FormLabel>{t("assignedAccount")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose account " />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          <Input
                            placeholder="Search account..."
                            onChange={(e) =>
                              setSearchAccountValue(e.target.value)
                            }
                          />
                          {filteredAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Contact</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user to assign the account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          <Input
                            placeholder="Search contact..."
                            onChange={(e) =>
                              setSearchContactValue(e.target.value)
                            }
                          />
                          {filteredContacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.first_name + " " + contact.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="campaign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From campaign</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 py-5">
          {form.formState.errors.root?.serverError && (
            <p className="text-sm text-destructive" aria-live="polite">
              {form.formState.errors.root.serverError.message}
            </p>
          )}
          <Button disabled={form.formState.isSubmitting} type="submit" data-testid="opportunity-submit-btn">
            {form.formState.isSubmitting ? (
              <span className="flex items-center animate-pulse">
                {c("savingData")}
              </span>
            ) : (
              c("create")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
