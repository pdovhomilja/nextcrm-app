import React from "react";
import Container from "../../components/ui/Container";
import { getTasks } from "@/actions/projects/get-tasks";
import { TasksDataTable } from "./components/data-table";
import { columns } from "./components/columns";

type Props = {};

const TasksPage = async (props: Props) => {
  const tasks: any = await getTasks();

  return (
    <Container
      title="All tasks"
      description={"Everything you need to know about tasks"}
    >
      <div>
        <TasksDataTable data={tasks} columns={columns} />
      </div>
    </Container>
  );
};

export default TasksPage;
