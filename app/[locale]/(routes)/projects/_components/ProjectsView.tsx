import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { getBoards } from "@/actions/projects/get-boards";

import { authOptions } from "@/lib/auth";

import NewTaskDialog from "../dialogs/NewTask";
import NewProjectDialog from "../dialogs/NewProject";

import { Button } from "@/components/ui/button";
import H2Title from "@/components/typography/h2";

import { ProjectsDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import AiAssistant from "./AiAssistant";
import { getTranslations } from "next-intl/server";

const ProjectsView = async () => {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("ProjectsPage");

  if (!session) return null;

  const userId = session.user.id;

  const boards: any = await getBoards(userId!);

  return (
    <>
      <div className="flex gap-2 py-10">
        <NewProjectDialog />
        <NewTaskDialog boards={boards} />
        <Button asChild>
          <Link href="/projects/tasks">{t("allTasks")}</Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/tasks/${userId}`}>{t("myTasks")}</Link>
        </Button>
        <Button asChild>
          <Link href="/projects/dashboard">{t("dashboard")}</Link>
        </Button>
        <AiAssistant session={session} />
      </div>
      <div className="pt-2 space-y-3">
        <H2Title>{t("projects")}</H2Title>
        <ProjectsDataTable data={boards} columns={columns} />
      </div>
    </>
  );
};

export default ProjectsView;
