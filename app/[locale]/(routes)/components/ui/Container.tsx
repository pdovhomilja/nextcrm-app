import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface ContainerProps {
  title: string;
  description: string;
  visibility?: string;
  children: React.ReactNode;
}

const Container = ({
  title,
  description,
  visibility,
  children,
}: ContainerProps) => {
  return (
    <div className="flex flex-col flex-1 h-full p-8 pt-6 overflow-hidden">
      <Heading
        title={title}
        description={description}
        visibility={visibility}
      />
      <Separator className="my-4" />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Container;
