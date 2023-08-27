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
    <div className="flex-1 space-y-4 p-8 pt-6 border-l h-full overflow-hidden">
      <Heading title={title} description={description} />
      <Separator />
      <div className="text-sm h-full overflow-auto pb-32 px-5 space-y-5">
        {children}
      </div>
    </div>
  );
};

export default Container;
