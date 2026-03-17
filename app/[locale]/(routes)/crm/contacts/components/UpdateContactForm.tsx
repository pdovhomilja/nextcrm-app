"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";
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

import { Switch } from "@/components/ui/switch";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";

//TODO: fix all the types
type UpdateContactFormProps = {
  initialData: any;
  accounts: any[];
  setOpen: (value: boolean) => void;
};

export function UpdateContactForm({
  initialData,
  accounts,
  setOpen,
}: UpdateContactFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("CrmContactForm");
  const c = useTranslations("Common");

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z.object({
    id: z.string().min(5),
    birthday_year: z.string().optional().nullable(),
    birthday_month: z.string().optional().nullable(),
    birthday_day: z.string().optional().nullable(),
    first_name: z.string().nullable().optional(),
    last_name: z.string(),
    description: z.string().nullable().optional(),
    email: z.string(),
    personal_email: z.string().nullable().optional(),
    office_phone: z.string().nullable().optional(),
    mobile_phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    status: z.boolean(),
    type: z.string(),
    assigned_to: z.string(),
    accountsIDs: z.string().nullable().optional(),
    assigned_account: z.string().nullable().optional(),
    social_twitter: z.string().nullable().optional(),
    social_facebook: z.string().nullable().optional(),
    social_linkedin: z.string().nullable().optional(),
    social_skype: z.string().nullable().optional(),
    social_youtube: z.string().nullable().optional(),
    social_tiktok: z.string().nullable().optional(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  // Parse birthday from initialData (single date) into year/month/day components
  // Coerce null → "" (strings) or false (booleans) to keep inputs controlled and pass Zod validation
  const parsedInitialData = {
    ...initialData,
    last_name: initialData.last_name ?? "",
    email: initialData.email ?? "",
    type: initialData.type ?? "",
    assigned_to: initialData.assigned_to ?? "",
    status: initialData.status ?? false,
    first_name: initialData.first_name ?? "",
    description: initialData.description ?? "",
    personal_email: initialData.personal_email ?? "",
    office_phone: initialData.office_phone ?? "",
    mobile_phone: initialData.mobile_phone ?? "",
    website: initialData.website ?? "",
    position: initialData.position ?? "",
    assigned_account: initialData.assigned_account ?? "",
    social_twitter: initialData.social_twitter ?? "",
    social_facebook: initialData.social_facebook ?? "",
    social_linkedin: initialData.social_linkedin ?? "",
    social_skype: initialData.social_skype ?? "",
    social_youtube: initialData.social_youtube ?? "",
    social_tiktok: initialData.social_tiktok ?? "",
    birthday_year: initialData.birthday ? new Date(initialData.birthday).getFullYear().toString() : "",
    birthday_month: initialData.birthday ? (new Date(initialData.birthday).getMonth() + 1).toString() : "",
    birthday_day: initialData.birthday ? new Date(initialData.birthday).getDate().toString() : "",
  };

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: parsedInitialData,
  });

  const contactType = [
    { name: t("customer"), id: "Customer" },
    { name: t("partner"), id: "Partner" },
    { name: t("vendor"), id: "Vendor" },
  ];

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/crm/contacts", data);
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
      router.refresh();
      setOpen(false);
    }
  };

  if (!accounts || !initialData)
    return <div>{c("somethingWentWrong")}</div>;

  const yearArray = Array.from(
    //start in 1923 and count to +100 years
    { length: 100 },
    (_, i) => i + 1923
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-4 md:px-10">
        <div className="w-full text-sm">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("firstName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lastName")}</FormLabel>
                  <FormControl>
                    <Input disabled={isLoading} placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mobilePhone")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="+11 1236 77 55"
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
                      placeholder="+11 1236 77 55"
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
                      placeholder="john@domain.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("personalEmail")}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="littlejohny@gmail.com"
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
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("birthday")}</label>
              <div className="flex space-x-3 w-full mt-2">
                <FormField
                  control={form.control}
                  name="birthday_year"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("year")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-56">
                          {yearArray.map((yearOption) => (
                            <SelectItem
                              key={yearOption}
                              value={yearOption.toString()}
                            >
                              {yearOption}
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
                  name="birthday_month"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("month")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-56">
                          {[
                            { value: "1", label: t("january") },
                            { value: "2", label: t("february") },
                            { value: "3", label: t("march") },
                            { value: "4", label: t("april") },
                            { value: "5", label: t("may") },
                            { value: "6", label: t("june") },
                            { value: "7", label: t("july") },
                            { value: "8", label: t("august") },
                            { value: "9", label: t("september") },
                            { value: "10", label: t("october") },
                            { value: "11", label: t("november") },
                            { value: "12", label: t("december") },
                          ].map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
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
                  name="birthday_day"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("day")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-56">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      placeholder={t("descriptionPlaceholder")}
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
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("assignedUser")}</FormLabel>
                      <FormControl>
                        <UserSearchCombobox
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder={t("assignedUserPlaceholder")}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assigned_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("assignAccount")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("assignAccountPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-56">
                          {accounts.map((account: any) => (
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
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("position")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="CTO"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">
                          {t("isActive")}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contactType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("contactTypePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="h-56">
                          {contactType.map((type) => (
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
              </div>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="social_twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("twitter")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://www.twitter.com/john"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("facebook")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://www.facebook.com/john"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("linkedin")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://www.linkedin.com/john"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_skype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("skype")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://www.skype.com/john"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_youtube"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("youtube")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://www.youtube.com/nextcrmio"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_tiktok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("tiktok")}</FormLabel>
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
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                {c("savingData")}
              </span>
            ) : (
              t("updateButton")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
