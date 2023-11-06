import Link from "next/link";

import { getUser } from "@/actions/get-user";

import { Button } from "@/components/ui/button";
import Container from "../components/ui/Container";
import GptCard from "./_components/GptCard";
import ResendCard from "./_components/ResendCard";

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
      title="Administration"
      description={"Here you can setup your NextCRM instance"}
    >
      <div className="space-x-2">
        <Button asChild>
          <Link href="/admin/users">Users administration</Link>
        </Button>
        <Button asChild>
          <Link href="/admin/modules">Modules administration</Link>
        </Button>
      </div>
      <div className="flex flex-col-1 gap-2">
        <GptCard />
        <ResendCard />
      </div>
    </Container>
  );
};

export default AdminPage;
