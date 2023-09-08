import React from "react";
import Container from "../../components/ui/Container";
import ProjectDashboardCockpit from "./components/ProjectDasboard";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";
import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ProjectDashboard = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const dasboardData: any = await getTasksPastDue();
  const activeUsers: any = await getActiveUsers();
  const boards = await getBoards(user?.id!);

  if (!dasboardData) {
    return <div>DashBoard data not found</div>;
  }

  return (
    <Container
      title="Dashboard"
      description={
        "Welcome to NextCRM cockpit, here you can see your company overview"
      }
    >
      <ProjectDashboardCockpit
        dashboardData={dasboardData}
        users={activeUsers}
        boards={boards}
      />
    </Container>
  );
};

export default ProjectDashboard;
