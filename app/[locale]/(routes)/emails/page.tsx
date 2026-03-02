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
  //console.log(layout, collapsed, "layout, collapsed");

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
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
          defaultLayout={defaultLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={8}
        />
      </Suspense>
    </Container>
  );
};

export default EmailRoute;
