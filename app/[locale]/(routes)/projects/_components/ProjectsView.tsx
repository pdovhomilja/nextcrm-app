import { getActiveUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import React from "react";
import NewProjectDialog from "../dialogs/NewProject";
import NewTaskDialog from "../dialogs/NewTask";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import H2Title from "@/components/typography/h2";
import { ProjectsDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";

type Props = {};

const ProjectsView = async (props: Props) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  const users = await getActiveUsers();
  const boards: any = await getBoards(userId!);

  return (
    <>
      <div className="flex gap-2 py-10">
        <NewProjectDialog />
        <NewTaskDialog users={users} boards={boards} />
        <Button asChild>
          <Link href="/projects/tasks">All Tasks</Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/tasks/${userId}`}>My Tasks</Link>
        </Button>
      </div>
      <div className="pt-2 space-y-3">
        <H2Title>Projects</H2Title>
        <ProjectsDataTable data={boards} columns={columns} />
      </div>
    </>
  );
};

export default ProjectsView;
