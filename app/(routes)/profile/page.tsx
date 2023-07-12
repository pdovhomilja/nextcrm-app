import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";
import { NotionForm } from "./components/NotionForm";
import H4Title from "@/components/typography/h4";

const ProfilePage = async () => {
  const data = await getUser();

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
        <H4Title>Notion Integration</H4Title>
        <NotionForm userId={data.id} />
      </div>
    </Container>
  );
};

export default ProfilePage;
