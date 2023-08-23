"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import axios from "axios";
import { PlusIcon, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const ContactView = ({ data, opportunityId }: any) => {
  const router = useRouter();

  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const onAddNew = () => {
    alert("Actions - not yet implemented");
  };

  const onView = (id: string) => {
    router.push(`/crm/contacts/${id}`);
  };

  const onUnlink = async (id: string) => {
    try {
      await axios.put(`/api/crm/contacts/unlink-opportunity/${id}`, {
        opportunityId,
      });
      toast({
        variant: "default",
        description: "Contact unlinked",
      });
      router.refresh();
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        description: "Failed to unlink contact",
      });
    }
  };

  if (!data)
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription></CardDescription>
            </div>
            <div>
              <Button onClick={onAddNew}>
                <PlusIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>No assigned contacts found</CardContent>
      </Card>
    );

  console.log(data, "data - contacts");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div>
            <Button onClick={onAddNew}>
              <PlusIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          {data.map((contact: any) => (
            <div key={data.id}>
              <div className="-mx-2 flex items-center space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <User className="mt-px h-5 w-5" />
                <div className="flex justify-between w-full">
                  <div className="flex justify-start items-center space-x-5">
                    <p className="text-sm font-medium leading-none">
                      {contact.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p>{contact.email}</p>
                    <p>{contact.office_phone}</p>

                    <p>{contact.mobile_phone}</p>
                  </div>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                        >
                          <DotsHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={() => onView(contact.id)}>
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUnlink(contact.id)}>
                          Unlink
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactView;
