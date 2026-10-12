import { redirect } from "next/navigation";

import { getSessionAnyStatus } from "@/lib/auth-server";
import { ChangePasswordForm } from "./components/ChangePasswordForm";

type Props = { params: Promise<{ locale: string }> };

export default async function ChangePasswordPage(props: Props) {
  const { locale } = await props.params;
  const session = await getSessionAnyStatus();

  if (!session) {
    redirect(`/${locale}/sign-in`);
  }

  if (session.user.userStatus === "INACTIVE") {
    redirect(`/${locale}/inactive`);
  }

  if (session.user.userStatus === "PENDING") {
    redirect(`/${locale}/pending`);
  }

  const mustChange = Boolean(
    (session.user as { mustChangePassword?: boolean }).mustChangePassword
  );
  if (!mustChange) {
    redirect(`/${locale}`);
  }

  return <ChangePasswordForm />;
}
