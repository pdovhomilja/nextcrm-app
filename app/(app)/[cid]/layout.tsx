import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <div className="flex justify-between items-center p-4">
        <Button variant="outline">
          <Link href="/">Home</Link>
        </Button>
        <SignOutButton />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

export default AppLayout;
