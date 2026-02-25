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
type NewTaskFormProps = {
  accounts: any[];
  onFinish: () => void;
};

export function NewContactForm({
  accounts,
  onFinish,
}: NewTaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("CrmContactForm");
  const c = useTranslations("Common");

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formSchema = z.object({
    birthday_year: z.string().optional().nullable(),
    birthday_month: z.string().optional().nullable(),
    birthday_day: z.string().optional().nullable(),
    first_name: z.string().optional(),
    last_name: z.string(),
    description: z.string().optional(),
    email: z.string(),
    personal_email: z.string().optional(),
    office_phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    website: z.string().optional(),
    position: z.string().optional(),
    status: z.boolean(),
    type: z.string(),
    assigned_to: z.string(),
    assigned_account: z.string().optional(),
    social_twitter: z.string().optional(),
    social_facebook: z.string().optional(),
    social_linkedin: z.string().optional(),
    social_skype: z.string().optional(),
    social_youtube: z.string().optional(),
    social_tiktok: z.string().optional(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  const form = useForm<NewAccountFormValues>({
    resolver: zodResolver(formSchema),
  });

  const contactType = [
    { name: t("customer"), id: "Customer" },
    { name: t("partner"), id: "Partner" },
    { name: t("vendor"), id: "Vendor" },
  ];

  const yearArray = Array.from(
    //start in 1923 and count to +100 years
    { length: 100 },
    (_, i) => i + 1923
  );

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.post("/api/crm/contacts", data);
      toast({
        title: c("success"),
        description: t("createSuccess"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: c("error"),
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      form.reset({
        first_name: "",
        last_name: "",
        description: "",
        email: "",
        personal_email: "",
        office_phone: "",
        mobile_phone: "",
        website: "",
        position: "",
        status: false,
        type: "",
        assigned_to: "",
        assigned_account: "",
        social_twitter: "",
        social_facebook: "",
        social_linkedin: "",
        social_skype: "",
        social_youtube: "",
        social_tiktok: "",
        birthday_year: "",
        birthday_month: "",
        birthday_day: "",
      });
      router.refresh();
      onFinish();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
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
            <h3>{t("birthday")}</h3>
            <div className="flex space-x-3 w-full mx-auto">
              <FormField
                control={form.control}
                name="birthday_year"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2 w-32">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("year")}</SelectTrigger>
                        <SelectContent>
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday_month"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2 w-28">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("month")}</SelectTrigger>
                        <SelectContent>
                          {/* Replace this with the range of months you want to allow */}
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (monthOption) => (
                              <SelectItem
                                key={monthOption}
                                value={monthOption.toString()}
                              >
                                {monthOption}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday_day"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex space-x-2">
                      <Select onValueChange={field.onChange}>
                        <SelectTrigger>{t("day")}</SelectTrigger>
                        <SelectContent>
                          {/* Replace this with the range of months you want to allow */}
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (dayOption) => (
                              <SelectItem
                                key={dayOption}
                                value={dayOption.toString()}
                              >
                                {dayOption}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("assignAccountPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
                          {accounts.map((account) => (
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("contactTypePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="flex overflow-y-auto h-56">
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
              t("createButton")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
