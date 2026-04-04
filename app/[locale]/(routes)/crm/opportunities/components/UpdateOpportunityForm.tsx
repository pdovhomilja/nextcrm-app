"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { AccountSearchCombobox } from "@/components/ui/account-search-combobox";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";

type ConfigItem = { id: string; name: string };

type UpdateOpportunityFormProps = {
  initialData: any;
  setOpen: (value: boolean) => void;
  saleTypes: ConfigItem[];
  saleStages: ConfigItem[];
  campaigns: ConfigItem[];
  currencies: { code: string; name: string; symbol: string }[];
};

export function UpdateOpportunityForm({
  initialData,
  setOpen,
  saleTypes,
  saleStages,
  campaigns,
  currencies,
}: UpdateOpportunityFormProps) {
  const t = useTranslations("CrmOpportunityForm");
  const c = useTranslations("Common");

  const formSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1, t("nameRequired")),
    close_date: z.date({
      message: "A expected close date is required.",
    }),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    sales_stage: z.string().nullable().optional(),
    budget: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    expected_revenue: z.string().nullable().optional(),
    next_step: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    account: z.string().nullable().optional(),
    contact: z.string().nullable().optional(),
    campaign: z.string().nullable().optional(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      ...initialData,
      description: initialData.description ?? "",
      budget: String(initialData.budget ?? ""),
      currency: initialData.currency ?? "",
      expected_revenue: String(initialData.expected_revenue ?? ""),
      next_step: initialData.next_step ?? "",
      assigned_to: initialData.assigned_to ?? "",
      account: initialData.account ?? "",
      contact: initialData.contact ?? "",
      campaign: initialData.campaign ?? "",
      type: initialData.type ?? "",
      sales_stage: initialData.sales_stage ?? "",
    },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
    ) as any;
    const result = await updateOpportunity(cleaned);
    if (result?.error) {
      form.setError("root.serverError", { message: result.error });
    } else {
      toast.success(t("updateSuccess"));
      setOpen(false);
    }
  };

  if (!initialData)
    return <div>{c("somethingWentWrong")}</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-4 md:px-10">
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
                          {saleTypes.map((type: any) => (
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
                    <FormItem>
                      <FormLabel>{t("saleStage")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("saleStagePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {saleStages.map((stage: any) => (
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
                          type={"number"}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
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
                    <FormItem>
                      <FormLabel>{t("assignedAccount")}</FormLabel>
                      <FormControl>
                        <AccountSearchCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Choose account"
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
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
                      <FormControl>
                        <Input
                          disabled={form.formState.isSubmitting}
                          placeholder="Contact ID"
                          {...field}
                        />
                      </FormControl>
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
                          {campaigns.map((campaign: any) => (
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
          <Button disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? (
              <span className="flex items-center animate-pulse">
                {c("savingData")}
              </span>
            ) : (
              c("update")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
