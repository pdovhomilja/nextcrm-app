"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";

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

import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import SuspenseLoading from "@/components/loadings/suspense";
import { UserSearchCombobox } from "@/components/ui/user-search-combobox";

//TODO: fix all the types
type NewTaskFormProps = {
  initialData: any;
  setOpen: (value: boolean) => void;
};

export function UpdateLeadForm({ initialData, setOpen }: NewTaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useSWR(
    "/api/crm/account",
    fetcher
  );

  const formSchema = z.object({
    id: z.string().min(5).max(30),
    firstName: z.string().optional().nullable(),
    lastName: z.string().min(3).max(30).nonempty(),
    company: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(0).max(15).nullable().optional(),
    description: z.string().nullable().optional(),
    lead_source: z.string().nullable().optional(),
    refered_by: z.string().optional().nullable(),
    //TODO: add campaing schema from db as data source
    campaign: z.string().optional().nullable(),
    assigned_to: z.string().optional(),
    status: z.string(),
    //TODO: add type schema from db as data source
    type: z.string().optional(),
    accountIDs: z.string().optional(),
  });

  type NewLeadFormValues = z.infer<typeof formSchema>;

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: NewLeadFormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/crm/leads", data);
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  const leadStatus = [
    { name: "New", id: "NEW" },
    { name: "In progress", id: "IN_PROGRESS" },
    { name: "Completed", id: "COMPLETED" },
  ];

  if (isLoadingAccounts)
    return (
      <div>
        <SuspenseLoading />
      </div>
    );

  if (!initialData)
    return <div>Something went wrong, there is no data for form</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-4 md:px-10">
        {/*        <div>
          <pre>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre>
        </div> */}
        <div className="w-full text-sm">
          <div className="pb-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Johny"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Walker"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
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
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="CTO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="johny@domain.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="+11 123 456 789"
                        {...field}
                      />
                    </FormControl>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={isLoading}
                      placeholder="New NextCRM functionality"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead source</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Website"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refered_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refered by</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Johny Walker"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="campaign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Social networks"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Cold lead"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned to</FormLabel>
                    <FormControl>
                      <UserSearchCombobox
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select a user"
                        disabled={isLoading}
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
                  <FormItem>
                    <FormLabel>Lead status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadStatus.map((status: any) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="accountIDs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign an Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose assigned account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                Saving data ...
              </span>
            ) : (
              "Update lead"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
