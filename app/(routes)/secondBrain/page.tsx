import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";
import { getNotions } from "@/actions/get-notions";

type Props = {};

const SecondBrainPage = async (props: Props) => {
  const notions = await getNotions();
  return (
    <Container
      title="Second Brain"
      description={"Everything you need to know about Your notions"}
    >
      <div></div>
      {/*       <div className="h-full overflow-auto">
        <pre>{JSON.stringify(notions, null, 2)}</pre>
      </div> */}
    </Container>
  );
};

export default SecondBrainPage;
