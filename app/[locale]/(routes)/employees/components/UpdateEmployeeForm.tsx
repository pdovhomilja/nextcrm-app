"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

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
import fetcher from "@/lib/fetcher";
import useSWR from "swr";
import SuspenseLoading from "@/components/loadings/suspense";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Calendar } from "@/components/ui/calendar";

//TODO: fix all the types
type NewTaskFormProps = {
  initialData: any;
  setOpen: (value: boolean) => void;
};

export function UpdateEmployeeForm({ initialData, setOpen }: NewTaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data: users, isLoading: isLoadingUsers } = useSWR(
    "/api/user",
    fetcher
  );

  const [searchTerm, setSearchTerm] = useState("");

  const formSchema = z.object({
    id: z.string(),
    firstName: z.string().min(3).max(50),
    lastName: z.string().min(3).max(50),
    email: z.string().email(),
    phone: z.string().optional(),
    position: z.string().optional(),
    IBAN: z.string().min(3).max(50),
    taxid: z.string().min(2).max(30).optional(),
    address: z.string().min(3).max(250).optional(),
    onBoarding: z.date().default(new Date()).optional(),
    insurance: z.string().min(3).max(50).optional(),
    salary: z.coerce.number().positive(),
  });

  type NewAccountFormValues = z.infer<typeof formSchema>;

  //TODO: fix this any
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: NewAccountFormValues) => {
    setIsLoading(true);
    try {
      await axios.put("/api/employee", data);
      toast({
        title: "Success",
        description: "Employee updated successfully",
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
      setOpen(false);
    }
  };

  if (isLoadingUsers)
    return (
      <div>
        <SuspenseLoading />
      </div>
    );

  const yearArray = Array.from(
    //start in 1923 and count to +100 years
    { length: 100 },
    (_, i) => i + 1923
  );

  const filteredData = users.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!users || !initialData)
    return <div>Something went wrong, there is no data for form</div>;

  //console.log(accounts, "accounts");
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full px-10">
        {/*    <div>
          <pre>
            <code>{JSON.stringify(form.formState.errors, null, 2)}</code>
          </pre>
        </div> */}
        {/*     <pre>
          <code>{JSON.stringify(initialData, null, 2)}</code>
        </pre> */}
        {/*   <div>
          <pre>
            <code>{JSON.stringify(form.watch(), null, 2)}</code>
          </pre>
        </div> */}
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder="Matt"
                  type="hidden"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className=" w-[800px] text-sm">
          <div className="pb-5 space-y-2">
            <div className="flex gap-5 pb-5">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Matt"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Parker"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex gap-5 pb-5">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
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
              </div>
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
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
              </div>
            </div>
            <div className="flex gap-5 pb-5">
              <div className="w-1/2 space-y-2">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Developer"
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
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="3500"
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
          <div className="flex gap-5 pb-5">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="IBAN"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter IBAN"
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
              name="onBoarding"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>onBoarding</FormLabel>
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
                            format(field?.value, "PPP")
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
            </div>
          </div>
          <div className="flex gap-5 pb-5">
            <div className="w-1/2 space-y-2">
              <FormField
                control={form.control}
                name="taxid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax id</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter Tax Id"
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
                name="insurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter insurance detail "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="flex gap-5 pb-5">
            <div className="w-full space-y-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        placeholder="address..."
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
        <div className="grid gap-2 py-5">
          <Button type="submit">
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                Saving data ...
              </span>
            ) : (
              "Update Employee"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}