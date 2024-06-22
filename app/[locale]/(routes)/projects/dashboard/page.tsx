import React from "react";
import Container from "../../components/ui/Container";
import ProjectDashboardCockpit from "./components/ProjectDasboard";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";
import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSections } from "@/actions/projects/get-sections";
import { Sections } from "@prisma/client";

const ProjectDashboard = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const dashboardData: any = await getTasksPastDue();
  const activeUsers: any = await getActiveUsers();
  const boards = await getBoards(user?.id!);
  const sections: Sections[] = await getSections();

  if (!dashboardData) {
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
        dashboardData={dashboardData}
        users={activeUsers}
        boards={boards}
        sections={sections}
      />
    </Container>
  );
};

export default ProjectDashboard;
