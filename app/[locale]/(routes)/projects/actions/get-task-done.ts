import axios from "axios";

//Actions
export const getTaskDone = async (taskId: string) => {
  try {
    await axios.post(`/api/projects/tasks/mark-task-as-done/${taskId}`);
  } catch (error) {
    console.log(error);
  }
};
