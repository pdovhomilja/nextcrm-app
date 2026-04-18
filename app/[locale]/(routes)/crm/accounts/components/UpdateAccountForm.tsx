"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Skeleton } from "@/components/ui/skeleton";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { getIndustries } from "@/actions/crm/get-industries";

interface UpdateAccountFormProps {
  //TODO: fix this any
  initialData: any;
  open: (value: boolean) => void;
}

export function UpdateAccountForm({
  initialData,
  open,
}: UpdateAccountFormProps) {
  const t = useTranslations("CrmAccountForm");
  const c = useTranslations("Common");

  const [industries, setIndustries] = useState<any[] | null>(null);
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(true);

  useEffect(() => {
    getIndustries()
      .then((data) => setIndustries(data))
      .finally(() => setIsLoadingIndustries(false));
  }, []);

  const formSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1, t("nameRequired")).max(100),
    office_phone: z.string().max(50).optional().nullable(),
    website: z.string().url(t("websiteInvalid")).optional().nullable().or(z.literal("")),
    fax: z.string().max(50).optional().nullable(),
    company_id: z.string().max(20).optional().nullable(),
    vat: z.string().max(20).optional().nullable(),
    email: z.string().email(t("emailInvalid")).optional().nullable().or(z.literal("")),
    billing_street: z.string().max(100).optional().nullable(),
    billing_postal_code: z.string().max(20).optional().nullable(),
    billing_city: z.string().max(100).optional().nullable(),
    billing_state: z.string().max(100).optional().nullable(),
    billing_country: z.string().max(100).optional().nullable(),
    shipping_street: z.string().max(100).optional().nullable(),
    shipping_postal_code: z.string().max(20).optional().nullable(),
    shipping_city: z.string().max(100).optional().nullable(),
    shipping_state: z.string().max(100).optional().nullable(),
    shipping_country: z.string().max(100).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    assigned_to: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    annual_revenue: z.string().optional().nullable(),
    member_of: z.string().max(100).optional().nullable(),
    industry: z.string().optional().nullable(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    //@ts-ignore
    //TODO: fix this
    defaultValues: initialData
      ? initialData
      : {
          id: "",
          v: 0,
          name: "",
          office_phone: "" as string | null,
          website: "",
          fax: "",
          company_id: "",
          vat: "",
          email: "",
          billing_street: "",
          billing_postal_code: "",
          billing_city: "",
          billing_state: "",
          billing_country: "",
          shipping_street: "",
          shipping_postal_code: "",
          shipping_city: "",
          shipping_state: "",
          shipping_country: "",
          description: "",
          assigned_to: "",
          status: "",
          annual_revenue: "",
          member_of: "",
          industry: "",
        },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    const payload = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
    ) as Parameters<typeof updateAccount>[0];
    const result = await updateAccount(payload);
    if (result?.error) {
      form.setError("root.serverError", { message: result.error });
    } else {
      toast.success(t("updateSuccess"));
      open(false);
    }
  };

  if (isLoadingIndustries)
    return (
      <div className="flex flex-col gap-2 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );

  if (!industries || !initialData)
    return <div>{c("somethingWentWrong")}</div>;

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
                  <FormLabel>{t("accountName")} <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="NextCRM Inc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="office_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("officePhone")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="+420 ...."
                      //@ts-ignore
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="account@domain.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="https://www.domain.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accountId")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="1234567890"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vatNumber")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="CZ1234567890"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="billing_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingStreet")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Švábova 772/18"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingPostalCode")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="252 18"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingCity")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Prague"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingState")}</FormLabel>
                    <FormControl>
                      <Input disabled={form.formState.isSubmitting} placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("billingCountry")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Czechia"
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
                name="shipping_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shippingStreet")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Švábova 772/18"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shippingPostalCode")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="252 18"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shippingCity")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Prague"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shippingState")}</FormLabel>
                    <FormControl>
                      <Input disabled={form.formState.isSubmitting} placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shippingCountry")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Czechia"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={form.formState.isSubmitting}
                        placeholder="Description"
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
                name="annual_revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("annualRevenue")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="1.0000.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="member_of"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("isMemberOf")}</FormLabel>
                    <FormControl>
                      <Input
                        disabled={form.formState.isSubmitting}
                        placeholder="Tesla Inc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("industry")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("industryPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="flex overflow-y-auto h-56">
                        {industries.map((industry: any) => (
                          <SelectItem key={industry.id} value={industry.id}>
                            {industry.name}
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
              <span className="flex items-center animate-pulse">{c("savingData")}</span>
            ) : (
              t("updateButton")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
