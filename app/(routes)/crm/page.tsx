import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";

type Props = {};

const CrmPage = (props: Props) => {
  return (
    <div className="p-10">
      <Heading title="CRM" description="Customer relations" />
      <Separator />
    </div>
  );
};

export default CrmPage;
