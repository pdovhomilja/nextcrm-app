import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";

const ProfilePage = async () => {
  const data = await getUser();
  return (
    <Container
      title="Ai assistant"
      description={"Ask anything you need to know"}
    >
      <div>Module content here</div>
    </Container>
  );
};

export default ProfilePage;
