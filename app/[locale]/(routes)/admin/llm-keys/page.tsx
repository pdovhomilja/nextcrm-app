import { getSystemApiKeys } from "../actions/api-keys";
import { ProviderKeyCard } from "./ProviderKeyCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Container from "../../components/ui/Container";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";

export default async function LlmKeysPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("AdminPage");

  if (!session?.user?.isAdmin) {
    return (
      <Container title="AI Provider Keys" description="LLM API key management">
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }

  const keys = await getSystemApiKeys();

  return (
    <Container
      title="AI Provider Keys"
      description="Priority: ENV → System-wide → User profile"
    >
      <div className="space-y-6 max-w-2xl">
        {/* Info banner */}
        <div className="flex gap-3 rounded-md border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            System-wide keys are used when no ENV variable is set. Users can configure
            their own keys in profile settings.
          </p>
        </div>

        {/* Provider cards */}
        <div className="grid gap-4">
          {keys.map((status) => (
            <ProviderKeyCard key={status.provider} status={status} />
          ))}
        </div>
      </div>
    </Container>
  );
}
