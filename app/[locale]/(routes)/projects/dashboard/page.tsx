import React from "react";
import Container from "../../components/ui/Container";
import ProjectDashboardCockpit from "./components/ProjectDasboard";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";
import { getBoards } from "@/actions/projects/get-boards";
import { getSession } from "@/lib/auth-server";
import { getSections } from "@/actions/projects/get-sections";
import { Sections } from "@prisma/client";
import { getTranslations } from "next-intl/server";

const ProjectDashboard = async () => {
  const session = await getSession();
  const user = session?.user;
  const t = await getTranslations("ProjectsPage");
  const dashboardData: any = await getTasksPastDue();
  const boards = await getBoards(user?.id!);
  const sections: Sections[] = await getSections();

  if (!dashboardData) {
    return <div>DashBoard data not found</div>;
  }

  return (
    <Container
      title={t("dashboardTitle")}
      description={t("dashboardDescription")}
    >
      <ProjectDashboardCockpit
        dashboardData={dashboardData}
        boards={boards}
        sections={sections}
      />
    </Container>
  );
};

export default ProjectDashboard;
