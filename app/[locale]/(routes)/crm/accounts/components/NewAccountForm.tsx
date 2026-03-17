"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";

type Props = {
  industries: any[];
  onFinish: () => void;
};

export function NewAccountForm({ industries, onFinish }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const t = useTranslations("CrmAccountForm");
  const c = useTranslations("Common");

  const formSchema = z.object({
    name: z.string().min(3).max(100),
    office_phone: z.string().optional(),
    website: z.string().optional(),
    fax: z.string().optional(),
    company_id: z.string().min(5).max(10),
    vat: z.string().max(20).optional(),
    email: z.string().email(),
    billing_street: z.string().min(3).max(50),
    billing_postal_code: z.string().min(2).max(10),
    billing_city: z.string().min(3).max(50),
    billing_state: z.string().min(3).max(50).optional(),
    billing_country: z.string().min(3).max(50),
    shipping_street: z.string().optional(),
    shipping_postal_code: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_country: z.string().optional(),
    description: z.string().min(3).max(1000).optional(),
    assigned_to: z.string().min(3).max(50),
    status: z.string().min(3).max(50).optional(),
    annual_revenue: z.string().min(3).max(50).optional(),
    member_of: z.string().min(3).max(50).optional(),
    industry: z.string().min(3).max(50),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    //console.log(data);
    setIsLoading(true);
    try {
      await axios.post("/api/crm/account", data);
      toast({
        title: c("success"),
        description: t("createSuccess"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: c("error"),
        description: t("errorDescription"),
      });
    } finally {
      form.reset();
      router.refresh();
      onFinish();
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-4 md:px-10">
        {/*        <div>
          <pre>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
          </pre>
        </div> */}
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
                      {...field}
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
                        {industries.map((industry) => (
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
            {t("createButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
