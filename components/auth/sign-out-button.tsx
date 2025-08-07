"use client";

import { signOutUser } from "@/actions/auth-actions";
import { useTransition } from "react";
import { IconLogout } from "@tabler/icons-react";

export const SignOutButton = () => {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutUser();
    });
  };

  return (
    <div onClick={handleSignOut} className="flex items-center gap-2">
      <IconLogout />
      {isPending ? "Signing out..." : "Sign Out"}
    </div>
  );
};
