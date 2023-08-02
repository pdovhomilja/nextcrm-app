import React, { Suspense } from "react";
import Container from "../components/ui/Container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Session } from "next-auth";
import { getBoards } from "@/actions/projects/get-boards";
import { ProjectsDataTable } from "./table-components/data-table";
import { columns } from "./table-components/columns";
import NewProjectDialog from "./dialogs/NewProject";
import H2Title from "@/components/typography/h2";
import NewTaskDialog from "./dialogs/NewTask";
import { getUsers } from "@/actions/get-users";
import ProjectsView from "./_components/ProjectsView";
import SuspenseLoading from "@/components/loadings/suspense";

const ProjectsPage = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (!session) return redirect("/sign-in");

  return (
    <Container
      title="Projects"
      description={"Everything you need to know about projects"}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ProjectsView />
      </Suspense>
    </Container>
  );
};

export default ProjectsPage;
