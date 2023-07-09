import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const AdminPage = async () => {
  const user = await getUser();

  if (!user?.is_admin) {
    return (
      <Container
        title="Administration"
        description="You are not admin, access not allowed"
      >
        <div className="flex w-full h-full items-center justify-center">
          Access not allowed
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="Administation"
      description={"Here you can setup your NextCRM instance"}
    >
      <div>
        <Button asChild>
          <Link href="/admin/users">Users administration</Link>
        </Button>
      </div>
    </Container>
  );
};

export default AdminPage;
