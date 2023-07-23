"use client";
import { useEffect } from "react";
import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
// import { updateTaskPosition } from "./apiCalls/updateTaskPosition";
/* import {
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentDuplicateIcon,
  DocumentPlusIcon,
  ExclamationCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"; */
import toast, { Toaster } from "react-hot-toast";
// import { updateSection } from "./apiCalls/updateSection";
// import { addTask } from "./apiCalls/addTask";
// import { deleteSection } from "./apiCalls/deleteSection";
// import { createSection } from "./apiCalls/createSection";
// import { deleteTask } from "./apiCalls/deleteTask";
// import useSWR from "swr";
// import fetcher from "../../lib/fetcher";
// import ProjectModal from "./modals/ProjectModal";
import moment from "moment";
import Link from "next/link";
import {
  ChatBubbleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { EyeIcon, Pencil, PlusIcon } from "lucide-react";
import { Icon } from "@radix-ui/react-select";
import LoadingComponent from "@/components/LoadingComponent";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
// import ChatModal from "../../components/modals/ChatModal";
// import ConfirmDeleteTask from "../../components/modals/ConfirmDeleteTask";
// import TaskDocuments from "./components/TaskDocuments";
//import TipTapEditor from "../../components/tipTapEditor/TipTapEditor";

let timer;
const timeout = 500;

const Kanban = (props: any) => {
  const [selectedTask, setSelectedTask] = useState(undefined);
  const [openProject, setOpenProject] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openDocuments, setOpenDocuments] = useState(false);
  const [data, setData]: any = useState([]);
  const boardId = props.boardId;
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    setData(props.data);
    setIsLoading(false);
  }, [props.data]);

  //Done
  const onDragEnd = async ({ source, destination }: DropResult) => {
    if (!destination) return;
    console.log(source, "source - onDragEnd");
    console.log(destination, "destination - onDragEnd");
    const sourceColIndex = data.findIndex(
      (e: any) => e.id === source.droppableId
    );
    const destinationColIndex = data.findIndex(
      (e: any) => e.id === destination.droppableId
    );

    const sourceCol = data[sourceColIndex];
    if (!sourceCol) return null;
    const destinationCol = data[destinationColIndex];

    const sourceSectionId = sourceCol.id;
    const destinationSectionId = destinationCol.id;

    const sourceTasks = [...sourceCol.tasks];
    const destinationTasks = [...destinationCol.tasks];

    if (source.droppableId !== destination.droppableId) {
      const [removed] = sourceTasks.splice(source.index, 1);
      destinationTasks.splice(destination.index, 0, removed);
      data[sourceColIndex].tasks = sourceTasks;
      data[destinationColIndex].tasks = destinationTasks;
    } else {
      const [removed] = destinationTasks.splice(source.index, 1);
      destinationTasks.splice(destination.index, 0, removed);
      data[destinationColIndex].tasks = destinationTasks;
    }

    try {
      /*       await updateTaskPosition({
        resourceList: sourceTasks,
        destinationList: destinationTasks,
        resourceSectionId: sourceSectionId,
        destinationSectionId: destinationSectionId,
      }); */
      setData(data);
      await axios.put(`/api/projects/tasks/update-kanban-position`, {
        resourceList: sourceTasks,
        destinationList: destinationTasks,
        resourceSectionId: sourceSectionId,
        destinationSectionId: destinationSectionId,
      });
      toast({
        title: "Task moved",
        description: "New task position saved in database",
      });
    } catch (err) {
      alert(err);
    }
  };

  //Done
  /*   const handelCreateSection = async () => {
    try {
      const newSection = await createSection(boardId);
      console.log(newSection, "Section");
      setData([...data, newSection]);
      mutate();
    } catch (err) {
      alert(err);
    }
  }; */

  //Done
  /*   const handelDeleteSection = async (sectionId) => {
    try {
      //await sectionApi.delete(boardId, sectionId);
      //console.log(sectionId, "sectionId - handelDeleteSection");

      await deleteSection(sectionId);
      const newData = [...data].filter((e) => e.id !== sectionId);
      setData(newData);
      mutate();
      //console.log("handelDeleteSection");
    } catch (err) {
      alert(err);
    }
  }; */

  //Done
  /*   const updateSectionTitle = async (e, sectionId) => {
    //console.log(e, "e - updateSectionTitle");
    //console.log(sectionId, "sectionId - updateSectionTitle");
    clearTimeout(timer);
    const newTitle = e.target.value;
    const newData = [...data];
    const index = newData.findIndex((e) => e.id === sectionId);
    newData[index].title = newTitle;
    setData(newData);
    timer = setTimeout(async () => {
      try {
        updateSection(sectionId, { title: newTitle });
      } catch (err) {
        alert(err);
      }
    }, timeout);
    mutate();
  }; */

  //Done
  /*   const createTask = async (sectionId) => {
    try {
      //console.log(sectionId, "sectionId - createTask");
      const task = await addTask(boardId, sectionId);
      //console.log(task, "task - createTask");
      const newData = [...data];
      //console.log(newData, "newData - createTask");
      const index = newData.findIndex((e) => e.id === sectionId);
      newData[index].tasks.unshift(task);
      setData(newData);
      mutate();
    } catch (err) {
      alert(err);
    }
  }; */

  //Done
  /*   const onUpdateTask = (task) => {
    const newData = [...data];
    //console.log(newData, "newData - onUpdateTask");
    //console.log(task, "task.section.id - onUpdateTask");
    const sectionIndex = newData.findIndex((e) => e.id === task.section);
    //console.log(sectionIndex, "sectionIndex - onUpdateTask");
    const taskIndex = newData[sectionIndex].tasks.findIndex(
      (e) => e.id === task.id
    );
    newData[sectionIndex].tasks[taskIndex] = task;
    setData(newData);
    mutate();
  }; */

  //Done
  /*   const onDeleteTask = (task) => {
    const newData = [...data];
    const sectionIndex = newData.findIndex((e) => e.id === task.section);
    const taskIndex = newData[sectionIndex].tasks.findIndex(
      (e) => e.id === task.id
    );
    newData[sectionIndex].tasks.splice(taskIndex, 1);
    setData(newData);
    mutate();
  };
 */
  //Done
  /*   const handelDeleteTask = async (task) => {
    //console.log("delete task");
    //console.log(boardId, "boardId", task.id, "task.id", "Deleting Task");
    try {
      toast.loading("Deleting Task...");
      console.log(task.id, "task.id fron hendelDeleteTask");
      await deleteTask(task.id);
      onDeleteTask(task);
      toast.success("Task Deleted");
      mutate();
    } catch (err) {
      alert(err);
    }
  }; */

  //console.log(data, "data - Kanban");
  //console.log(selectedTask?.id, "selectedTask - Kanban");
  if (isLoading) return <LoadingComponent />;

  return (
    <div className="overflow-scroll flex flex-col space-y-2  ">
      {/* Toasts */}
      <Toaster toastOptions={{ position: "top-right", duration: 1500 }} />
      {/* Modals */}
      {/*       <div>
        <ProjectModal
          openProject={openProject}
          setOpenProject={setOpenProject}
          task={selectedTask}
          boardId={boardId}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
        />
   
        <ChatModal
          openChat={openChat}
          setOpenChat={setOpenChat}
          task={selectedTask}
        />
        <ConfirmDeleteTask
          openConfirmDelete={openConfirmDelete}
          setOpenConfirmDelete={setOpenConfirmDelete}
          task={selectedTask}
          onDelete={() => {
            //handelDeleteTask(selectedTask);
          }}
        />
        <TaskDocuments
          openDocuments={openDocuments}
          setOpenDocuments={setOpenDocuments}
          task={selectedTask}
          boardId={boardId}
        />
      </div> */}
      <div className="p-2 text-xs">
        <p>{data?.length} Sections</p>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-row items-start  ">
          {data?.map((section: any, index: any) => (
            <div
              className="flex flex-col items-center justify-center  h-full w-80 "
              key={section.id}
            >
              <Droppable key={section.id} droppableId={section.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col  w-full h-full px-2 "
                  >
                    <div className="flex flex-col items-center justify-center py-2   ">
                      <div className="flex flex-row items-center justify-between w-full border ">
                        <input
                          type="text"
                          className="  pl-2 bg-slate-900 px-1 py-3 rounded-md m-2  "
                          placeholder={section?.title}
                          //onChange={(e) => updateSectionTitle(e, section.id)}
                        />
                        <div className="flex items-center justify-end pr-2">
                          <span className="border rounded-full px-2 m-2">
                            {section?.tasks?.length}
                          </span>

                          <button
                          //onClick={() => handelDeleteSection(section.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="flex flex-row items-center justify-center space-x-5 py-2  w-full">
                          <button
                            className="w-80 border justify-center items-center flex flex-row "
                            //onClick={() => createTask(section.id)}
                          >
                            <PlusIcon className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="">
                      {section.tasks?.map((task: any, index: any) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              cursor={snapshot.isDragging ? "grabbing" : "grab"}
                              className="flex flex-col overflow-hidden items-start justify-center text-xs p-2 m-2  rounded-md border  shadow-md "
                            >
                              <div className="flex flex-row justify-between mx-auto w-full">
                                <h2 className="font-bold text-sm ">
                                  {task.title === "" ? "Untitled" : task.title}
                                </h2>
                                {task?.dueDateAt &&
                                  task.dueDateAt > Date.now() && (
                                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                  )}
                              </div>
                              <div>
                                Due date:{" "}
                                {moment(task.dueDateAt).format("YYYY-MM-DD")}
                              </div>
                              <div>
                                <p
                                  className={
                                    task.priority === "normal"
                                      ? `text-yellow-500`
                                      : task.priority === "high"
                                      ? `text-red-500`
                                      : task.priority === "low"
                                      ? `text-green-500`
                                      : `text-slate-600`
                                  }
                                >
                                  Priorita: {task.priority}
                                </p>
                              </div>
                              <div>
                                <p className="line-clamp-2">{task.content}</p>
                              </div>
                              <div className="flex  gap-2 pt-2">
                                <Link
                                  href={`/projects/tasks/viewtask/${task.id}`}
                                >
                                  <EyeIcon className="w-4 h-4 text-slate-600" />
                                </Link>
                                <Pencil
                                  className="w-4 h-4 text-slate-600"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setOpenProject(true);
                                    //setOpen(true);
                                  }}
                                />
                                <ChatBubbleIcon
                                  className="w-4 h-4 text-slate-600"
                                  onClick={async () => {
                                    await setSelectedTask(task);
                                    setOpenChat(true);
                                  }}
                                />
                                <Icon
                                  title="Edit task documents"
                                  className="w-4 h-4 text-slate-600"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setOpenDocuments(true);
                                  }}
                                />
                                <TrashIcon
                                  className="w-4 h-4"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setOpenConfirmDelete(true);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      {/*  <TaskModalRight
        task={selectedTask}
        show={true}
        boardId={boardId}
        onClose={() => setSelectedTask(undefined)}
        onUpdate={onUpdateTask}
        onDelete={onDeleteTask}
      /> */}
    </div>
  );
};

export default Kanban;
