"use client";

import axios from "axios";
import moment from "moment";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { Check, EyeIcon, Pencil, PlusCircle, PlusIcon } from "lucide-react";

import {
  ChatBubbleIcon,
  DotsHorizontalIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AlertModal from "@/components/modals/alert-modal";
import LoadingComponent from "@/components/LoadingComponent";
import { DialogHeader } from "@/components/ui/dialog-document-view";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import NewSectionForm from "../forms/NewSection";
import UpdateTaskDialog from "../../../dialogs/UpdateTask";
import { getTaskDone } from "../../../actions/get-task-done";

let timer: any;
const timeout = 1000;

interface Task {
  id: string;
  section: string;
}

const Kanban = (props: any) => {
  const boardId = props.boardId;
  const boards = props.boards;
  const users = props.users;

  const [data, setData]: any = useState([]);

  const [sectionId, setSectionId] = useState(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [open, setOpen] = useState(false);
  const [openSectionAlert, setOpenSectionAlert] = useState(false);
  const [sectionOpenDialog, setSectionOpenDialog] = useState(false);
  const [updateOpenSheet, setUpdateOpenSheet] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSection, setIsLoadingSection] = useState(false);

  const router = useRouter();

  const { toast } = useToast();

  useEffect(() => {
    setData(props.data);
    setIsLoading(false);
  }, [props.data]);

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

  const onDeleteSection = async () => {
    setIsLoadingSection(true);
    try {
      await axios.delete(`/api/projects/sections/delete-section/${sectionId}`);
      const newData = [...data].filter((e) => e.id !== sectionId);
      setData(newData);
      toast({
        title: "Section deleted",
        description: "Section deleted successfully",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong, during deleting section",
      });
    } finally {
      setIsLoadingSection(false);
      setSectionId(null);
      setOpenSectionAlert(false);
      router.refresh();
    }
  };

  //Done
  const updateSectionTitle = async (
    e: ChangeEvent<HTMLInputElement>,
    sectionId: string
  ) => {
    clearTimeout(timer);
    const newTitle = e.target.value;
    const newData = [...data];
    const index = newData.findIndex((e) => e.id === sectionId);
    newData[index].title = newTitle;
    setData(newData);
    timer = setTimeout(async () => {
      try {
        //updateSection(sectionId, { title: newTitle });
        await axios.put(`/api/projects/sections/update-title/${sectionId}`, {
          newTitle,
        });
        toast({
          title: "Section title updated",
          description: "New section title saved in database",
        });
      } catch (err) {
        alert(err);
      }
    }, timeout);
  };

  //Done
  const createTask = async (sectionId: string) => {
    //console.log(sectionId, "sectionId - createTask");
    //const task = await addTask(boardId, sectionId);
    try {
      const task = await axios.post(
        `/api/projects/tasks/create-task/${boardId}`,
        {
          section: sectionId,
        }
      );
      //console.log(task, "task - createTask");
      const newData = [...data];
      //console.log(newData, "newData - createTask");
      const index = newData.findIndex((e) => e.id === sectionId);
      newData[index].tasks.unshift(task);
      setData(newData);
      toast({
        title: "Task created",
        description: "New task saved in database",
      });
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong, during creating task",
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const onDone = async (id: string) => {
    setIsLoading(true);
    try {
      await getTaskDone(id);
      toast({
        title: "Success, task marked as done.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, task not marked as done.",
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const onDelete = async () => {
    setOpen(false);
    setIsLoading(true);
    if (!selectedTask || !selectedTask.id || !selectedTask.section) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid task. Please select a valid task to delete.",
      });
      setIsLoading(false);
      return;
    }
    try {
      await axios.delete(`/api/projects/tasks/`, {
        data: {
          id: selectedTask.id,
          section: selectedTask.section,
        },
      });
      toast({
        title: "Task deleted",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Task deleted",
        description: "Something went wrong, during deleting task",
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  if (isLoading) return <LoadingComponent />;

  //console.log(sectionId, "sectionId - Kanban");
  //console.log(updateOpenSheet, "updateOpenSheet - Kanban");

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={isLoading}
      />
      <AlertModal
        isOpen={openSectionAlert}
        onClose={() => setOpenSectionAlert(false)}
        onConfirm={onDeleteSection}
        loading={isLoadingSection}
      />
      <div className="overflow-scroll flex flex-col space-y-2  ">
        {/* Dialogs */}
        <Dialog
          open={sectionOpenDialog}
          onOpenChange={() => setSectionOpenDialog(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="p-2">Create new section</DialogTitle>
              <DialogDescription className="p-2">
                Fill out the form below to create a new section to this project.
              </DialogDescription>
            </DialogHeader>
            <NewSectionForm
              boardId={boardId}
              onClose={() => setSectionOpenDialog(false)}
            />
          </DialogContent>
        </Dialog>
        {/* Dialogs end */}
        {
          //Sheets
        }
        <Sheet
          open={updateOpenSheet}
          onOpenChange={() => setUpdateOpenSheet(false)}
        >
          <SheetContent>
            <UpdateTaskDialog
              users={users}
              boards={boards}
              boardId={boardId}
              initialData={selectedTask}
              onDone={() => setUpdateOpenSheet(false)}
            />
            <div className="flex w-full justify-end pt-2">
              <SheetTrigger asChild>
                <Button variant={"destructive"}>Close</Button>
              </SheetTrigger>
            </div>
          </SheetContent>
        </Sheet>
        {
          //Sheets end
        }

        <div className="p-2 text-xs">
          <p>{data?.length} Sections</p>
        </div>
        <div className="flex">
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
                              className="  pl-2  px-1 py-1 rounded-md m-2  "
                              placeholder={section?.title}
                              onChange={(e) =>
                                updateSectionTitle(e, section.id)
                              }
                            />
                            <div className="flex items-center justify-end pr-2">
                              <span className="border rounded-full px-2 m-2">
                                {section?.tasks?.length}
                              </span>

                              <TrashIcon
                                className="w-4 h-4"
                                onClick={() => {
                                  setSectionId(section.id);
                                  setOpenSectionAlert(true);
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-full">
                            <div className="flex flex-row items-center justify-center space-x-5 py-2  w-full">
                              <button
                                className="w-80 border justify-center items-center flex flex-row "
                                onClick={() => createTask(section.id)}
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
                                  cursor={
                                    snapshot.isDragging ? "grabbing" : "grab"
                                  }
                                  className="flex flex-col overflow-hidden items-start justify-center text-xs p-3 mb-2  rounded-md border  shadow-md "
                                  type="button"
                                >
                                  <div className="flex flex-row justify-between mx-auto w-full py-1">
                                    {/*  <pre>{JSON.stringify(task, null, 2)}</pre> */}
                                    <h2 className="grow font-bold text-sm ">
                                      {task.title === ""
                                        ? "Untitled"
                                        : task.title}
                                    </h2>
                                    <div className="ml-1">
                                      {task?.dueDateAt &&
                                        task.taskStatus != "COMPLETE" &&
                                        task.dueDateAt < Date.now() && (
                                          <HoverCard>
                                            <HoverCardTrigger>
                                              <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                            </HoverCardTrigger>
                                            <HoverCardContent>
                                              Attention! This task is overdue!
                                            </HoverCardContent>
                                          </HoverCard>
                                        )}
                                      {task.taskStatus === "COMPLETE" && (
                                        <HoverCard>
                                          <HoverCardTrigger>
                                            <Check className="w-4 h-4 text-green-500" />
                                          </HoverCardTrigger>
                                          <HoverCardContent>
                                            This task is done!
                                          </HoverCardContent>
                                        </HoverCard>
                                      )}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        asChild
                                        className="w-[25px] ml-1 "
                                      >
                                        <DotsHorizontalIcon className="w-4 h-4 text-slate-600 pl-2" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="w-[200px]">
                                        <DropdownMenuItem
                                          className="gap-2"
                                          onClick={() =>
                                            router.push(
                                              `/projects/tasks/viewtask/${task.id}`
                                            )
                                          }
                                        >
                                          <EyeIcon className="w-4 h-4 opacity-50" />
                                          View
                                        </DropdownMenuItem>
                                        {task.taskStatus !== "COMPLETE" && (
                                          <DropdownMenuItem
                                            className="gap-2"
                                            onClick={() => {
                                              setUpdateOpenSheet(true);
                                              setSelectedTask(task);
                                            }}
                                          >
                                            <Pencil className="w-4 h-4 opacity-50" />
                                            Edit
                                          </DropdownMenuItem>
                                        )}
                                        {task.taskStatus !== "COMPLETE" && (
                                          <DropdownMenuItem
                                            className="gap-2"
                                            onClick={() => {
                                              onDone(task.id);
                                            }}
                                          >
                                            <Check className="w-4 h-4 opacity-50" />
                                            Mark as done
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          className="gap-2"
                                          onClick={() => {
                                            setSelectedTask(task);
                                            setOpen(true);
                                          }}
                                        >
                                          <TrashIcon className="w-4 h-4 opacity-50" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <div className="py-1">
                                    Due date:{" "}
                                    {moment(task.dueDateAt).format(
                                      "YYYY-MM-DD"
                                    )}
                                  </div>
                                  <div className="my-2">
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
                                  <HoverCard>
                                    <HoverCardTrigger className="line-clamp-2 mb-2">
                                      {task.content}
                                    </HoverCardTrigger>
                                    <HoverCardContent>
                                      {task.content}
                                    </HoverCardContent>
                                  </HoverCard>
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
            <div className="flex justify-center items-center pl-3 h-16">
              <PlusCircle
                className="w-8 h-8 text-slate-600 cursor-pointer"
                onClick={() => {
                  setSectionOpenDialog(true);
                }}
              />
            </div>
          </DragDropContext>
        </div>
      </div>
    </>
  );
};

export default Kanban;
