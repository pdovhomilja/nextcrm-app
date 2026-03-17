"use client";

import React from "react";
import { z } from "zod";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

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
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import SuspenseLoading from "@/components/loadings/suspense";
import { crm_Accounts } from "@prisma/client";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";

interface UpdateAccountFormProps {
  //TODO: fix this any
  initialData: any;
  open: (value: boolean) => void;
}

export function UpdateAccountForm({
  initialData,
  open,
}: UpdateAccountFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const t = useTranslations("CrmAccountForm");
  const c = useTranslations("Common");

  const { data: industries, isLoading: isLoadingIndustries } = useSWR(
    "/api/crm/industries",
    fetcher
  );

  const formSchema = z.object({
    id: z.string().min(5).max(30),
    name: z.string().min(3).max(80),
    office_phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    company_id: z.string().min(5).max(10),
    vat: z.string().min(5).max(20).nullable().optional(),
    email: z.string().email(),
    billing_street: z.string().min(3).max(50),
    billing_postal_code: z.string().min(2).max(10),
    billing_city: z.string().min(3).max(50),
    billing_state: z.string().min(3).max(50).nullable().optional(),
    billing_country: z.string().min(3).max(50),
    shipping_street: z.string().nullable().optional(),
    shipping_postal_code: z.string().nullable().optional(),
    shipping_city: z.string().nullable().optional(),
    shipping_state: z.string().nullable().optional(),
    shipping_country: z.string().nullable().optional(),
    description: z.string().min(3).max(250).nullable().optional(),
    assigned_to: z.string().min(3).max(50),
    status: z.string().min(3).max(50).nullable().optional(),
    annual_revenue: z.string().min(3).max(50).nullable().optional(),
    member_of: z.string().min(3).max(50).nullable().optional(),
    industry: z.string().min(3).max(50),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
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
    //console.log(data);
    setIsLoading(true);
    try {
      await axios.put("/api/crm/account", data);
      toast({
        title: c("success"),
        description: t("updateSuccess"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: c("error"),
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      open(false);
      router.refresh();
    }
  };

  if (isLoadingIndustries)
    return (
      <div>
        <SuspenseLoading />
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
        {/*    <div>
          <pre>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre>
        </div> */}
        {/*       <pre>
          <code>{JSON.stringify(initialData, null, 2)}</code>
        </pre> */}

        <div className="w-full text-sm">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("accountName")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                      <Input disabled={isLoading} placeholder="" {...field} />
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                      <Input disabled={isLoading} placeholder="" {...field} />
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
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
          <Button disabled={isLoading} type="submit">
            {t("updateButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
