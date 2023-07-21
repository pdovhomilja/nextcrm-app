import React from "react";
import Container from "../../components/ui/Container";
import ProjectDashboardCockpit from "./components/ProjectDasboard";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";

type Props = {};

const ProjectDashboard = async (props: Props) => {
  const dasboardData: any = await getTasksPastDue();
  return (
    <Container
      title="Dashboard"
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <ProjectDashboardCockpit dashboardData={dasboardData} />
    </Container>
  );
};

export default ProjectDashboard;
