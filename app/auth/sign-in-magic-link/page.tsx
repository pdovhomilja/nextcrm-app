import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { LoginFormMagicLink } from "@/components/auth/login-form-magic-link";

const SingInMagicLinkPage = async () => {
  const session = await auth();

  if (!session) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-3xl">
          <LoginFormMagicLink />
        </div>
      </div>
    );
  } else {
    redirect("/");
  }
};

export default SingInMagicLinkPage;
