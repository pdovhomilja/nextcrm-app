"use client";

import axios from "axios";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, { ChangeEvent, useEffect, useState } from "react";
import { Check, EyeIcon, Pencil, PlusCircle, PlusIcon } from "lucide-react";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import NewSectionForm from "../forms/NewSection";
import UpdateTaskDialog from "../../../dialogs/UpdateTask";
import { getTaskDone } from "../../../actions/get-task-done";

let timer: any;
const timeout = 1000;

interface Task {
  id: string;
  section: string;
  title?: string;
  content?: string;
  dueDateAt?: Date;
  priority?: string;
  taskStatus?: string;
}

// Draggable Task Item Component
function TaskItem({ task, onDelete, onDone, onEdit, router }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [currentTime] = React.useState(() => Date.now());

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col overflow-hidden items-start justify-center text-xs p-3 mb-2  rounded-md border  shadow-md cursor-grab active:cursor-grabbing"
    >
      <div className="flex flex-row justify-between mx-auto w-full py-1">
        <h2 className="grow font-bold text-sm ">
          {task.title === "" ? "Untitled" : task.title}
        </h2>
        <div className="ml-1">
          {task?.dueDateAt &&
            task.taskStatus != "COMPLETE" &&
            task.dueDateAt < currentTime && (
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
              <HoverCardContent>This task is done!</HoverCardContent>
            </HoverCard>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="w-[25px] ml-1 ">
            <DotsHorizontalIcon className="w-4 h-4 text-slate-600 pl-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuItem
              className="gap-2"
              onClick={() => router.push(`/projects/tasks/viewtask/${task.id}`)}
            >
              <EyeIcon className="w-4 h-4 opacity-50" />
              View
            </DropdownMenuItem>
            {task.taskStatus !== "COMPLETE" && (
              <DropdownMenuItem className="gap-2" onClick={() => onEdit(task)}>
                <Pencil className="w-4 h-4 opacity-50" />
                Edit
              </DropdownMenuItem>
            )}
            {task.taskStatus !== "COMPLETE" && (
              <DropdownMenuItem
                className="gap-2"
                onClick={() => onDone(task.id)}
              >
                <Check className="w-4 h-4 opacity-50" />
                Mark as done
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="gap-2" onClick={() => onDelete(task)}>
              <TrashIcon className="w-4 h-4 opacity-50" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="py-1">
        Due date: {moment(task.dueDateAt).format("YYYY-MM-DD")}
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
        <HoverCardContent>{task.content}</HoverCardContent>
      </HoverCard>
    </div>
  );
}

const Kanban = (props: any) => {
  const boardId = props.boardId;
  const boards = props.boards;

  const [data, setData]: any = useState([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setData(props.data);
    setIsLoading(false);
  }, [props.data]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the task being dragged
    for (const section of data) {
      const task = section.tasks.find((t: Task) => t.id === active.id);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source section and task
    let sourceSectionIndex = -1;
    let sourceTaskIndex = -1;
    let sourceTask: Task | null = null;

    for (let i = 0; i < data.length; i++) {
      const taskIndex = data[i].tasks.findIndex((t: Task) => t.id === activeId);
      if (taskIndex !== -1) {
        sourceSectionIndex = i;
        sourceTaskIndex = taskIndex;
        sourceTask = data[i].tasks[taskIndex];
        break;
      }
    }

    if (!sourceTask || sourceSectionIndex === -1) return;

    // Check if overId is a section or a task
    const destinationSectionIndex = data.findIndex(
      (section: any) => section.id === overId
    );

    let targetSectionIndex = destinationSectionIndex;
    let targetTaskIndex = 0;

    if (destinationSectionIndex === -1) {
      // overId is a task, find its section
      for (let i = 0; i < data.length; i++) {
        const taskIndex = data[i].tasks.findIndex((t: Task) => t.id === overId);
        if (taskIndex !== -1) {
          targetSectionIndex = i;
          targetTaskIndex = taskIndex;
          break;
        }
      }
    }

    if (targetSectionIndex === -1) return;

    const newData = [...data];
    const sourceSection = newData[sourceSectionIndex];
    const targetSection = newData[targetSectionIndex];

    // Remove task from source
    const [movedTask] = sourceSection.tasks.splice(sourceTaskIndex, 1);

    // Add task to target
    if (sourceSectionIndex === targetSectionIndex) {
      targetSection.tasks.splice(targetTaskIndex, 0, movedTask);
    } else {
      targetSection.tasks.splice(targetTaskIndex, 0, movedTask);
    }

    setData(newData);

    try {
      await axios.put(`/api/projects/tasks/update-kanban-position`, {
        resourceList: sourceSection.tasks,
        destinationList: targetSection.tasks,
        resourceSectionId: sourceSection.id,
        destinationSectionId: targetSection.id,
      });
      toast({
        title: "Task moved",
        description: "New task position saved in database",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task position",
      });
      // Revert on error
      setData(props.data);
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

  const createTask = async (sectionId: string) => {
    try {
      const task = await axios.post(
        `/api/projects/tasks/create-task/${boardId}`,
        {
          section: sectionId,
        }
      );
      const newData = [...data];
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

        <Sheet
          open={updateOpenSheet}
          onOpenChange={() => setUpdateOpenSheet(false)}
        >
          <SheetContent className="max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Update Task</SheetTitle>
              <SheetDescription>
                Edit task details including title, description, due date, priority, and assignments
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <UpdateTaskDialog
                boards={boards}
                boardId={boardId}
                initialData={selectedTask}
                onDone={() => setUpdateOpenSheet(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="p-2 text-xs">
          <p>{data?.length} Sections</p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-row items-start  ">
            {data?.map((section: any) => (
              <div
                className="flex flex-col items-center justify-center  h-full w-80 "
                key={section.id}
              >
                <div className="flex flex-col  w-full h-full px-2 ">
                  <div className="flex flex-col items-center justify-center py-2   ">
                    <div className="flex flex-row items-center justify-between w-full border ">
                      <input
                        type="text"
                        className="  pl-2  px-1 py-1 rounded-md m-2  "
                        placeholder={section?.title}
                        onChange={(e) => updateSectionTitle(e, section.id)}
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

                  <SortableContext
                    items={section.tasks.map((t: Task) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="">
                      {section.tasks?.map((task: any) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onDelete={() => {
                            setSelectedTask(task);
                            setOpen(true);
                          }}
                          onDone={onDone}
                          onEdit={() => {
                            setUpdateOpenSheet(true);
                            setSelectedTask(task);
                          }}
                          router={router}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
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

          <DragOverlay>
            {activeTask ? (
              <div className="flex flex-col overflow-hidden items-start justify-center text-xs p-3 mb-2  rounded-md border  shadow-md opacity-80 bg-white">
                <h2 className="font-bold text-sm">
                  {activeTask.title === "" ? "Untitled" : activeTask.title}
                </h2>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
};

export default Kanban;
