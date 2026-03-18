import { markTaskDone } from "@/actions/projects/mark-task-done";

//Actions - wrapper kept for backwards compatibility
export const getTaskDone = async (taskId: string) => {
  try {
    await markTaskDone(taskId);
  } catch (error) {
    console.log(error);
  }
};
