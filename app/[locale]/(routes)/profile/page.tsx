import { getUser } from "@/actions/get-user";
import { getTranslations } from "next-intl/server";

import Container from "../components/ui/Container";
import { NotionForm } from "./components/NotionForm";
import { ProfileForm } from "./components/ProfileForm";
import { PasswordChangeForm } from "./components/PasswordChange";
import { ProfilePhotoForm } from "./components/ProfilePhotoForm";

import H4Title from "@/components/typography/h4";
import { OpenAiForm } from "./components/OpenAiForm";
import { LanguageForm } from "./components/LanguageForm";

const ProfilePage = async () => {
  const t = await getTranslations("ProfilePage");
  const data = await getUser();

  if (!data) {
    return <div>No user data.</div>;
  }

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <div>
        {/*         <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre> */}
        <H4Title>{t("profilePhoto")}</H4Title>
        <ProfilePhotoForm data={data} />

        <H4Title>{t("profile")}</H4Title>
        <ProfileForm data={data} />

        <H4Title>{t("passwordChange")}</H4Title>
        <PasswordChangeForm userId={data.id} />

        <H4Title>{t("notionIntegration")}</H4Title>
        <NotionForm userId={data.id} />

        <H4Title>{t("language")}</H4Title>
        <LanguageForm userId={data.id} />

        <H4Title>{t("openAiIntegration")}</H4Title>
        <OpenAiForm userId={data.id} />
      </div>
    </Container>
  );
};

export default ProfilePage;
