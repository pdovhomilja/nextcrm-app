"use client";

import React from "react";
import { z } from "zod";

import { useRouter } from "next/navigation";

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
import { MyAccount, crm_Accounts } from "@prisma/client";
import { init } from "next/dist/compiled/@vercel/og/satori";
import { Switch } from "@/components/ui/switch";

interface UpdateAccountFormProps {
  //TODO: fix this any
  initialData: MyAccount | null;
}

export function MyAccountSettingsForm({ initialData }: UpdateAccountFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const formSchema = z.object({
    id: z.string().optional(),
    company_name: z.string(),
    is_person: z.boolean(),
    email: z.string().email({ message: "Invalid email" }),
    email_accountant: z.string().email({ message: "Invalid email" }),
    phone_prefix: z
      .string()
      .max(5, { message: "Invalid phone prefix" })
      .nullable()
      .optional(),
    phone: z
      .string()
      .max(20, { message: "Invalid phone number" })
      .nullable()
      .optional(),
    mobile_prefix: z
      .string()
      .max(5, { message: "Invalid mobile prefix" })
      .nullable()
      .optional(),
    mobile: z
      .string()
      .max(20, { message: "Invalid mobile number" })
      .nullable()
      .optional(),
    fax_prefix: z
      .string()
      .max(5, { message: "Invalid fax prefix" })
      .nullable()
      .optional(),
    fax: z
      .string()
      .max(20, { message: "Invalid fax number" })
      .nullable()
      .optional(),
    website: z
      .string()
      .url({ message: "Invalid website url" })
      .nullable()
      .optional(),
    street: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    country_code: z
      .string()
      .max(2, { message: "Invalid country code" })
      .nullable()
      .optional(),
    billing_street: z.string(),
    billing_city: z.string(),
    billing_state: z.string().nullable().optional(),
    billing_zip: z.string(),
    billing_country: z.string(),
    billing_country_code: z
      .string()
      .max(2, { message: "Invalid country code" }),
    currency: z.string(),
    currency_symbol: z.string(),
    VAT_number: z.string(),
    TAX_number: z.string().nullable().optional(),
    bank_name: z.string(),
    bank_account: z.string(),
    bank_code: z.string(),
    bank_IBAN: z.string().nullable().optional(),
    bank_SWIFT: z.string().nullable().optional(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? initialData
      : {
          company_name: "",
          is_person: false,
          email: "",
          email_accountant: "",
          phone_prefix: null,
          phone: null,
          mobile_prefix: null,
          mobile: null,
          fax_prefix: null,
          fax: null,
          website: null,
          street: "",
          city: null,
          state: null,
          zip: null,
          country: null,
          country_code: null,
          billing_street: null,
          billing_city: null,
          billing_state: null,
          billing_zip: null,
          billing_country: null,
          billing_country_code: null,
          currency: null,
          currency_symbol: null,
          VAT_number: "",
          TAX_number: null,
          bank_name: null,
          bank_account: null,
          bank_code: null,
          bank_IBAN: null,
          bank_SWIFT: null,
        },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    //console.log(data);
    setIsLoading(true);

    try {
      if (initialData?.id) {
        await axios.put("/api/my-account", data);
        toast({
          title: "Success",
          description: "My account updated successfully",
        });
      } else {
        await axios.post("/api/my-account", data);
        toast({
          title: "Success",
          description: "My account created successfully",
        });
      }
      /*     if (response.status === 200) {
        router.push("/");
      } */
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        <div>
          {/*        <pre>
            <code>{JSON.stringify(initialData, null, 2)}</code>
          </pre> */}
          {/*     <pre>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
          </pre> */}
          {/*     <pre>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre> */}
        </div>

        <div className=" w-[800px] text-sm">
          <div className="pb-5 space-y-2 ">
            <div className="flex space-x-5 py-2">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name={"company_name"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name</FormLabel>
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
                  name={"VAT_number"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT number (ICO)</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="12345678"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"tax_number"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TAX number</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="CZ12345678"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"bank_name"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Fio banka, a.s."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"bank_account"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank account</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="123456789"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"bank_code"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank code</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="2010"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"bank_IBAN"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="CZ1234567890000060000001"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"bank_SWIFT"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SWIFT</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="FIOBCZPPXXX"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="is_person"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Is Company a person?
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
                  name={"email"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company e-mail</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="info@domain.cz"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"email_accountant"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company e-mail for exported XML</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="info@domain.cz"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"currency"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="CZK"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"currency_symbol"}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency symbol</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Kč"
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
          <div className="flex space-x-5 py-2">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name={"phone_prefix"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone prefix</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="+420"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"phone"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="123 456 789"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"mobile_prefix"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile prefix</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="+420"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"mobile"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile phone</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="608 123 456"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name={"fax_prefix"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fax prefix</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="+420"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"fax"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fax</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="123 456 789"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex space-x-5 py-2">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name={"street"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office street</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"city"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office City</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="New York"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"state"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office state</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"zip"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office zip</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"country"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office country</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"country_code"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office country code</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="CZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name={"billing_street"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business street</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"billing_city"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business City</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="New York"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"billing_state"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business state</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"billing_zip"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business zip</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />{" "}
              <FormField
                control={form.control}
                name={"billing_country"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business country</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"billing_country_code"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business country code</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="CZ" {...field} />
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
            {initialData?.id ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
