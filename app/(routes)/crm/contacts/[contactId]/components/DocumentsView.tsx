"use client";
import { columns } from "@/app/(routes)/documents/components/columns";
import { DocumentsDataTable } from "@/app/(routes)/documents/components/data-table";
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
import { CoinsIcon, File, Link, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface DocumentsViewProps {
  data: any;
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

  if (!data || data.length === 0)
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription></CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={onAddNew}>
                <Link className="h-3 w-3" />
              </Button>
              {/*     <RightViewModal
            label={"+"}
            title="Create new lead"
            description=""
          >
            <NewLeadForm users={users} accounts={accounts} />
          </RightViewModal> */}
            </div>
          </div>
        </CardHeader>
        <CardContent>No assigned documents found</CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div>
            {/*           <Button onClick={onAddNew}>
              <PlusIcon className="h-5 w-5" />
            </Button> */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DocumentsDataTable data={data} columns={columns} />
      </CardContent>
    </Card>
  );
};

export default DocumentsView;
