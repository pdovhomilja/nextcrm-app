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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { CoinsIcon, File, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface DocumentsViewProps {
  data: {
    id: string;
    document_name: string;
    map: Function;
  };
}

const DocumentsView = ({ data }: DocumentsViewProps) => {
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

  if (!data) return <div>No documents found</div>;
  console.log(data, "data");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
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
          {data.map((document: { id: string; document_name: string }) => (
            <div key={data.id}>
              <div className="-mx-2 flex items-center space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground">
                <File className="mt-px h-5 w-5" />
                <div className="flex justify-between w-full">
                  <div className="flex justify-start items-center space-x-5">
                    <p className="text-sm font-medium leading-none">
                      {document.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {document.document_name}
                    </p>
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
                        <DropdownMenuItem>View</DropdownMenuItem>
                        <DropdownMenuItem>Unlink</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>{" "}
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

export default DocumentsView;
