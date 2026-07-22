import ResendCard from "../_components/ResendCard";
import { getSession } from "@/lib/auth-server";
import Container from "../../components/ui/Container";
import { getTranslations } from "next-intl/server";

export default async function ServicesPage() {
  const session = await getSession();
  const t = await getTranslations("AdminPage");

  // The admin layout already gates on requireRole(["admin"]); this page-level
  // check mirrors the other admin pages as defense-in-depth. The Resend key
  // write itself is authorized in the setResendKey server action.
  if (session?.user?.role !== "admin") {
    return (
      <Container title="Services" description="System service integrations">
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="Services"
      description="System service integrations. Priority: ENV → System-wide (DB)."
    >
      <div className="space-y-6 max-w-2xl">
        <ResendCard />
      </div>
    </Container>
  );
}
