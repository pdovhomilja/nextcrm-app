import { getTask } from "@/actions/projects/get-task";
import { getUserTasks } from "@/actions/projects/get-user-tasks";
import Container from "@/app/(routes)/components/ui/Container";
import React from "react";

type TaskDetailPageProps = {
  params: {
    userId: string;
  };
};

const TaskDetailPage = ({ params }: TaskDetailPageProps) => {
  const { userId } = params;
  const tasks = getUserTasks(userId);
  return (
    <Container
      title="Tasks detail"
      description={"Everything you need to know about tasks"}
    >
      <div>
        <pre>{JSON.stringify(tasks, null, 2)}</pre>
      </div>
    </Container>
  );
};

export default TaskDetailPage;
