"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { z } from "zod";
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
import { useToast } from "@/components/ui/use-toast";
import { FingerprintIcon } from "lucide-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import LoadingComponent from "@/components/LoadingComponent";

export function CustomerLoginComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);
  //State for dialog to be by opened and closed by DialogTrigger
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const router = useRouter();

  const formSchema = z.object({
    email: z.string().min(3).max(50),
    password: z.string().min(8).max(50),
  });

  type LoginFormValues = z.infer<typeof formSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  //Login with username(email)/password
  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const status = await signIn("customer-credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
        callbackUrl: "/en/customer-portal",
      }, {
        nextauth: {
          pathname: "/api/auth/customer",
        }
      });
      //console.log(status, "status");
      if (status?.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: status.error,
        });
      }
      if (status?.ok) {
        // console.log("Status OK");
        toast({
          description: "Login successful.",
        });
        router.push("/en/customer-portal");
      }
    } catch (error: any) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error!,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onPasswordReset(email: string) {
    try {
      setIsLoading(true);
      await axios.post("/api/customer/password-reset", {
        email,
      });
      toast({
        title: "Success",
        description: "Password reset email has been sent.",
      });
    } catch (error) {
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Something went wrong while resetting the password.",
        });
      }
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  }

  return (
    <Card className="shadow-lg my-5 ">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Customer Login</CardTitle>
        <CardDescription>Enter your email and password to login.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="john.doe@example.com"
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
            </div>
            <div className="grid gap-2 py-8">
              <Button
                disabled={isLoading}
                type="submit"
                className="flex gap-2 h-12"
              >
                <span
                  className={
                    isLoading
                      ? " border rounded-full px-3 py-2 animate-spin"
                      : "hidden"
                  }
                >
                  C
                </span>
                <span className={isLoading ? " " : "hidden"}>Loading ...</span>
                <span className={isLoading ? "hidden" : ""}>Login</span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-.col space-y-5">
        <div className="text-sm text-gray-500">
          Need an account? Register{" "}
          <Link href={"/customer-portal/register"} className="text-blue-500">
            here
          </Link>
        </div>
        <div className="text-sm text-gray-500">
          Need password reset? Click
          {/* Dialog start */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="text-blue-500">
              <span className="px-2">here</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="p-5">Password Reset</DialogTitle>
                <DialogDescription className="p-5">
                  Enter your email address and we will send a new password to your
                  e-mail.
                </DialogDescription>
              </DialogHeader>
              {isLoading ? (
                <LoadingComponent />
              ) : (
                <div className="flex px-2 space-x-5 py-5">
                  <Input
                    type="email"
                    placeholder="name@domain.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    disabled={email === ""}
                    onClick={() => {
                      onPasswordReset(email);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              )}
              <DialogTrigger className="w-full text-right pt-5 ">
                <Button variant={"destructive"}>Cancel</Button>
              </DialogTrigger>
            </DialogContent>
          </Dialog>
          {/* Dialog end */}
        </div>
      </CardFooter>
    </Card>
  );
}
