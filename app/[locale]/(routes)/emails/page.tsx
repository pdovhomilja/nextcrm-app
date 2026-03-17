import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MailComponent } from "./components/mail";
import { accounts, mails } from "@/app/[locale]/(routes)/emails/data";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

const EmailRoute = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const t = await getTranslations("ModuleMenu");

  const layout = (await cookies()).get("react-resizable-panels:layout");
  const collapsed = (await cookies()).get("react-resizable-panels:collapsed");

  // Parse layout with validation - ensure left panel is visible
  const FALLBACK_LAYOUT = [20, 35, 45];
  let validatedLayout: number[] | undefined;
  
  if (layout) {
    try {
      const parsed = JSON.parse(layout.value);
      // Validate: must be array of 3 numbers, first panel >= 18%
      if (
        Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.every((n: number) => typeof n === "number" && n > 0) &&
        parsed[0] >= 18
      ) {
        validatedLayout = parsed;
      } else {
        validatedLayout = FALLBACK_LAYOUT;
      }
    } catch {
      validatedLayout = FALLBACK_LAYOUT;
    }
  }

  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  return (
    <Container
      title={t("emails")}
      description={
        "This module is in development. Now it is only frontend demo."
      }
    >
      <Suspense fallback={<SuspenseLoading />}>
        <MailComponent
          accounts={accounts}
          mails={mails}
          defaultLayout={validatedLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={8}
        />
      </Suspense>
    </Container>
  );
};

export default EmailRoute;
