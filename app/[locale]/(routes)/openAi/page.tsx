import Container from "../components/ui/Container";
import Chat from "./components/Chat";

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
