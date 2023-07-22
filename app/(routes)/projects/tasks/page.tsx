import React from "react";
import Container from "../../components/ui/Container";
import { getTasks } from "@/actions/projects/get-tasks";
import { TasksDataTable } from "./components/data-table";
import { columns } from "./components/columns";
import RightViewModal from "@/components/modals/right-view-modal";
import { NewTaskForm } from "./components/NewTaskForm";
import { getUsers } from "@/actions/get-users";
import { getBoards } from "@/actions/projects/get-boards";
import { getSections } from "@/actions/projects/get-sections";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const TasksPage = async () => {
  const session: Session | null = await getServerSession(authOptions);
  if (!session) return redirect("/sign-in");
  const userId = session?.user.id;

  const tasks: any = await getTasks();
  const boards: any = await getBoards(userId);
  const sections: any = await getSections();
  const users: any = await getUsers();

  return (
    <Container
      title="All tasks"
      description={"Everything you need to know about tasks"}
    >
      <div className="py-5">
        <RightViewModal
          label={"Create new task"}
          title="Create new task"
          description=""
        >
          <NewTaskForm users={users} boards={boards} sections={sections} />
        </RightViewModal>
      </div>
      <div>
        <TasksDataTable data={tasks} columns={columns} />
      </div>
    </Container>
  );
};

export default TasksPage;
