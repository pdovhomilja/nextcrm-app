import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";

const ProfilePage = async () => {
  const data = await getUser();
  return (
    <Container
      title="Profile"
      description={"Here you can edit your user profile"}
    >
      <div>
        <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    </Container>
  );
};

export default ProfilePage;
