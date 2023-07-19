import React from "react";
import Container from "../components/ui/Container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Session } from "next-auth";
import { getBoards } from "@/actions/projects/get-boards";
import { ProjectsDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import NewProjectDialog from "./dialogs/NewProject";
import H2Title from "@/components/typography/h2";

const ProjectsPage = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (!session) return redirect("/sign-in");

  const userId = session?.user.id;

  const boards: any = await getBoards(userId);
  //console.log(boards, "boards");

  return (
    <Container
      title="Projects"
      description={"Everything you need to know about projects"}
    >
      <div className="flex gap-2 py-10">
        <NewProjectDialog />
        <Button asChild>
          <Link href="/projects/tasks">Tasks</Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/tasks/${userId}`}>My Tasks</Link>
        </Button>
      </div>
      <div className="pt-2 space-y-3">
        <H2Title>Projects</H2Title>
        <ProjectsDataTable data={boards} columns={columns} />
      </div>
    </Container>
  );
};

export default ProjectsPage;
