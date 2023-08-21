import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Container from "../components/ui/Container";

import { BarChartDemo } from "@/components/tremor/BarChart";
import { getUsersByMonth } from "@/actions/get-users";

type Props = {};

const ReportsPage = async (props: Props) => {
  const newUsers = await getUsersByMonth();

  return (
    <Container
      title="Reports"
      description={
        "Here will be predefined reports for every module. We use Tremor for data visualization."
      }
    >
      <div className="pt-5">
        <BarChartDemo chartData={newUsers} />
      </div>
    </Container>
  );
};

export default ReportsPage;
