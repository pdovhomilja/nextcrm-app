import { prismadb } from "@/lib/prisma";
import Container from "../components/ui/Container";
import Chat from "./components/Chat";

import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

const ProfilePage = async () => {
  const user = await getServerSession(authOptions);

  const openAiKey = await prismadb.openAi_keys.findFirst({
    where: {
      user: user?.user?.id,
    },
  });

  //console.log(openAiKey);
  if (!openAiKey)
    return (
      <Container
        title="Ai assistant"
        description={"Ask anything you need to know"}
      >
        <div>
          <h1>Open AI key not found</h1>
          <p>
            Please add your open ai key in your
            <Link href={"/profile"} className="text-blue-500">
              {" "}
              profile settings page{" "}
            </Link>{" "}
            to use the assistant
          </p>
        </div>
      </Container>
    );

  return (
    <Container
      title="Ai assistant"
      description={"Ask anything you need to know"}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <Chat />
      </Suspense>
    </Container>
  );
};

export default ProfilePage;
