import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getUser } from "@/actions/get-user";

import { Button } from "@/components/ui/button";
import Container from "../components/ui/Container";

import GptCard from "./_components/GptCard";
import ResendCard from "./_components/ResendCard";
import OpenAiCard from "./_components/OpenAiCard";

const AdminPage = async () => {
  const user = await getUser();
  const t = await getTranslations("AdminPage");

  if (!user?.is_admin) {
    return (
      <Container
        title={t("title")}
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }

  return (
    <Container
      title={t("title")}
      description={t("setupDescription")}
    >
      <div className="space-x-2">
        <Button asChild>
          <Link href="/admin/users">{t("usersAdmin")}</Link>
        </Button>
        <Button asChild>
          <Link href="/admin/modules">{t("modulesAdmin")}</Link>
        </Button>
      </div>
      <div className="flex flex-row flex-wrap space-y-2 md:space-y-0 gap-2">
        <GptCard />
        <ResendCard />
        <OpenAiCard />
      </div>
    </Container>
  );
};

export default AdminPage;
