import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";

type Props = {};

const CrmPage = (props: Props) => {
  return (
    <Container
      title="Databox"
      description={
        "Everything you need to know about Databox alias Datové schránky"
      }
    >
      <div>Module content here</div>
    </Container>
  );
};

export default CrmPage;
