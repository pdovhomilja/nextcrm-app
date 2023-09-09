import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";
import { NotionForm } from "./components/NotionForm";
import H4Title from "@/components/typography/h4";
import { ProfileForm } from "./components/ProfileForm";
import { Users } from "@prisma/client";
import { PasswordChangeForm } from "./components/PasswordChange";
import { ProfilePhotoForm } from "./components/ProfilePhotoForm";

const ProfilePage = async () => {
  const data: Users = await getUser();

  if (!data) {
    return <div>No user data.</div>;
  }

  return (
    <Container
      title="Profile"
      description={"Here you can edit your user profile"}
    >
      <div>
        {/*         <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre> */}
        <H4Title>Profile photo</H4Title>
        <ProfilePhotoForm data={data} />

        <H4Title>Profile</H4Title>
        <ProfileForm data={data} />

        <H4Title>Password change</H4Title>
        <PasswordChangeForm userId={data.id} />

        <H4Title>Notion Integration</H4Title>
        <NotionForm userId={data.id} />
      </div>
    </Container>
  );
};

export default ProfilePage;
