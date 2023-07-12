import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/actions/get-user";
import Container from "../components/ui/Container";
import Chat from "./components/Chat";
import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream } from "ai";
import { Suspense } from "react";

const ProfilePage = async () => {
  return (
    <Container
      title="Ai assistant"
      description={"Ask anything you need to know"}
    >
      <Suspense>
        <Chat />
      </Suspense>
      <Chat />
    </Container>
  );
};

export default ProfilePage;
