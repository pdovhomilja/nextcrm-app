import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React, { ReactComponentElement } from "react";

interface ContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const Container = ({ title, description, children }: ContainerProps) => {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6 border-l h-full">
      <Heading title={title} description={description} />
      <Separator />
      <div className="h-full overflow-hidden text-sm">{children}</div>
    </div>
  );
};

export default Container;
