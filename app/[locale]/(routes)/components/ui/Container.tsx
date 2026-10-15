import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React from "react";

interface ContainerProps {
  title: string;
  description: string;
  visibility?: string;
  children: React.ReactNode;
  className?: string;
}

const Container = ({
  title,
  description,
  visibility,
  children,
  className,
}: ContainerProps) => {
  return (
    <div className={cn("flex h-full w-full flex-1 flex-col", className)}>
      <Heading
        title={title}
        description={description}
        visibility={visibility}
      />
      <Separator className="my-5 bg-border/60" />
      <div className="flex-1 min-h-0 w-full">
        {children}
      </div>
    </div>
  );
};

export default Container;
