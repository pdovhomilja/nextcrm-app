"use client";

import { z } from "zod";
import axios from "axios";
import { useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
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

import useDebounce from "@/hooks/useDebounce";

//TODO: fix all the types
type NewTaskFormProps = {
  users: any[];
  accounts: crm_Accounts[];
  contacts: crm_Contacts[];
  salesType: crm_Opportunities_Type[];
  saleStages: crm_Opportunities_Sales_Stages[];
  campaigns: crm_campaigns[];
  selectedStage?: string;
  accountId?: string;
  onDialogClose: () => void;
};

export function NewOpportunityForm({
  users,
  accounts,
  contacts,
  salesType,
  saleStages,
  campaigns,
  selectedStage,
  accountId,
  onDialogClose,
}: NewTaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [searchUserValue, setSearchUserValue] = useState<string>("");
  const debouncedValue = useDebounce(searchUserValue, 1000);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(debouncedValue.toLowerCase())
  );

  const [searchAccountValue, setSearchAccountValue] = useState<string>("");
  const debouncedAccountValue = useDebounce(searchAccountValue, 1000);

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(debouncedAccountValue.toLowerCase())
  );

  const [searchContactValue, setSearchContactValue] = useState<string>("");
  const debouncedContactValue = useDebounce(searchContactValue, 1000);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.last_name
        .toLowerCase()
        .includes(debouncedContactValue.toLowerCase()) ||
      (contact.first_name &&
        contact.first_name
          .toLowerCase()
          .includes(debouncedContactValue.toLowerCase()))
  );

  const formSchema = z.object({
    name: z.string(),
    close_date: z.date({
      required_error: "A expected close date is required.",
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
    defaultValues: {
      sales_stage: selectedStage ? selectedStage : undefined,
      account: accountId ? accountId : undefined,
    },
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.post("/api/crm/opportunity", data);
      toast({
        title: "Success",
        description: "Opportunity created successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
      router.refresh();
      onDialogClose();
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
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full h-full px-10"
      >
        {/*         <div>
          <pre>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
          </pre>
        </div> */}

        <div className=" w-[800px] text-sm">
          <div className="pb-5 space-y-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oportunity name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
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
                  <FormLabel>Expected close date</FormLabel>
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
                            <span>Pick a expected close date</span>
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
            <div className="flex space-x-5">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose type " />
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
                      <FormLabel>Sale stage</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={selectedStage}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose actual stage " />
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
                      <FormLabel>Bugdget</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={isLoading}
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
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="USD"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expected_revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected revenue</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={isLoading}
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
                      <FormLabel>Next step</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={isLoading}
                          placeholder="Describe the next step"
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
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned to</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user to assign the account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="overflow-y-auto h-56">
                          <Input
                            placeholder="Search user..."
                            onChange={(e) => setSearchUserValue(e.target.value)}
                          />
                          {filteredUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
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
                  name="account"
                  render={({ field }) => (
                    <FormItem hidden={accountId ? true : false}>
                      <FormLabel>Assigned Account</FormLabel>
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
                {/*  <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Assigned contact</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-[200px] justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? test.find(
                                    (contact) => contact.value === field.value
                                  )?.label //TODO: attention here
                                : "Select Contact"}
                              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Search in contacts..." />
                            <CommandEmpty>No contact found.</CommandEmpty>
                            <CommandGroup>
                              {test.map((contact) => (
                                <CommandItem
                                  value={contact.value}
                                  key={contact.value}
                                  onSelect={(value) => {
                                    form.setValue("contact", value);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      contact.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {contact.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        This is the language that will be used in the dashboard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 py-5">
          <Button disabled={isLoading} type="submit">
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                Saving data ...
              </span>
            ) : (
              "Create opportunity"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
