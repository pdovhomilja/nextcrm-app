import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { MailComponent } from "./components/mail";
import { accounts, mails } from "@/app/[locale]/(routes)/emails/data";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDictionary } from "@/dictionaries";

const EmailRoute = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  //Get user language
  const lang = session.user.userLanguage;

  //Fetch translations from dictionary
  const dict = await getDictionary(lang as "en" | "cz" | "de");

  const layout = (await cookies()).get("react-resizable-panels:layout");
  const collapsed = (await cookies()).get("react-resizable-panels:collapsed");
  //console.log(layout, collapsed, "layout, collapsed");

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  return (
    <Container
      title={dict.ModuleMenu.emails}
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
          navCollapsedSize={4}
        />
      </Suspense>
    </Container>
  );
};

export default EmailRoute;
