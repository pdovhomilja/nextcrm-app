"use client";
import { z } from "zod";
import axios from "axios";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import React from "react";
import { FingerprintIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function CustomerRegisterComponent() {
  const router = useRouter();
  const { toast } = useToast();

  //Local states
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [show, setShow] = React.useState<boolean>(false);

  const formSchema = z.object({
    name: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8).max(50),
    confirmPassword: z.string().min(8).max(50),
  });

  type BillboardFormValues = z.infer<typeof formSchema>;

  const form = useForm<BillboardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: BillboardFormValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/customer", data);
      toast({
        title: "Success",
        description: "Customer account created successfully, please login.",
      });

      if (response.status === 200) {
        router.push("/customer-portal/sign-in");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data,
      });
    } finally {
      setIsLoading(false);
    }
  };

  //Localizations
  const t = useTranslations("RegisterComponent");

  return (
    <Card className="shadow-lg ">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create a customer account</CardTitle>
        <CardDescription>Enter your details below to create an account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 overflow-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="John Doe"
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
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="name@domain.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center w-full ">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          className="w-full"
                          disabled={isLoading}
                          placeholder="Password"
                          type={show ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span
                  className="flex px-4 pt-7 w-16"
                  onClick={() => setShow(!show)}
                >
                  <FingerprintIcon size={25} className="text-gray-400" />
                </span>
              </div>
              <div className="flex items-center w-full ">
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          className="w-full"
                          disabled={isLoading}
                          placeholder="Password"
                          type={show ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span
                  className="flex px-4 pt-7 w-16"
                  onClick={() => setShow(!show)}
                >
                  <FingerprintIcon size={25} className="text-gray-400" />
                </span>
              </div>
            </div>

            <div className="grid gap-2 py-5">
              <Button disabled={isLoading} type="submit">
                Create account
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-5">
        <div className="text-sm text-gray-500">
          Already have an account?{" "}
          <Link href={"/customer-portal/sign-in"} className="text-blue-500">
            sign-in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
