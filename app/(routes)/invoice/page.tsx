import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";

type Props = {};

const CrmPage = (props: Props) => {
  return (
    <Container
      title="Invoices"
      description={"Everything you need to know about invoices and TAX"}
    >
      <div>Module content here</div>
    </Container>
  );
};

export default CrmPage;
