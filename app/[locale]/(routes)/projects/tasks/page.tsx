import React from "react";
import Container from "../../components/ui/Container";
import { getTasks } from "@/actions/projects/get-tasks";
import { TasksDataTable } from "./components/data-table";
import { columns } from "./components/columns";

import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

const TasksPage = async () => {
  const tasks: any = await getTasks();
  const t = await getTranslations("ProjectsPage");

  return (
    <Container
      title={t("tasks.title")}
      description={t("tasks.description")}
    >
      <div className="py-5">
        <Button>{t("tasks.newTask")}</Button>
      </div>
      <div>
        <TasksDataTable data={tasks} columns={columns} />
      </div>
    </Container>
  );
};

export default TasksPage;
