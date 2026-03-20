"use client";

import moment from "moment";
import { useRouter } from "next/navigation";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Check, EyeIcon, Pencil, PlusCircle, PlusIcon } from "lucide-react";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
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
import { toast } from "sonner";
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
import { markTaskDone } from "@/actions/projects/mark-task-done";
import { deleteSection } from "@/actions/projects/delete-section";
import { updateSectionTitle } from "@/actions/projects/update-section-title";
import { createTaskInBoard } from "@/actions/projects/create-task-in-board";
import { deleteTask } from "@/actions/projects/delete-task";
import { updateKanbanPosition } from "@/actions/projects/update-kanban-position";

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

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-h-[50px]">
      {children}
    </div>
  );
}

const Kanban = (props: any) => {
  const boardId = props.boardId;
  const boards = props.boards;

  const serverDataRef = useRef(props.data);
  const [data, setData]: any = useState(() =>
    structuredClone(props.data || [])
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const dataRef = useRef<any[]>(data);
  dataRef.current = data;
  const origSectionIdRef = useRef<string | null>(null); // section at drag start
  const isDraggingRef = useRef(false);

  // Sync from server after router.refresh() — only when not dragging
  useEffect(() => {
    if (serverDataRef.current !== props.data && !isDraggingRef.current) {
      serverDataRef.current = props.data;
      setData(structuredClone(props.data || []));
    }
  }, [props.data]);

  const setDataAndRef = (newData: any[]) => {
    dataRef.current = newData;
    setData(newData);
  };

  const [sectionId, setSectionId] = useState(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [open, setOpen] = useState(false);
  const [openSectionAlert, setOpenSectionAlert] = useState(false);
  const [sectionOpenDialog, setSectionOpenDialog] = useState(false);
  const [updateOpenSheet, setUpdateOpenSheet] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSection, setIsLoadingSection] = useState(false);

  const router = useRouter();

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

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    const activeId = active.id as string;
    for (const section of dataRef.current) {
      const task = section.tasks.find((t: Task) => t.id === activeId);
      if (task) {
        setActiveTask(task);
        origSectionIdRef.current = section.id; // record where drag started
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const current = dataRef.current;

    // Find source section and task index
    let fromSectionIdx = -1, fromTaskIdx = -1;
    for (let i = 0; i < current.length; i++) {
      const idx = current[i].tasks.findIndex((t: Task) => t.id === activeId);
      if (idx !== -1) { fromSectionIdx = i; fromTaskIdx = idx; break; }
    }
    if (fromSectionIdx === -1) return;

    // Determine destination — overId could be a section ID or a task ID
    let toSectionIdx = current.findIndex((s: any) => s.id === overId);
    let toTaskIdx = 0;
    const isOverSection = toSectionIdx !== -1;

    if (!isOverSection) {
      // overId is a task — find which section it belongs to
      for (let i = 0; i < current.length; i++) {
        const idx = current[i].tasks.findIndex((t: Task) => t.id === overId);
        if (idx !== -1) { toSectionIdx = i; toTaskIdx = idx; break; }
      }
    } else {
      // Dropping directly onto section — insert at end
      toTaskIdx = current[toSectionIdx].tasks.length;
    }

    if (toSectionIdx === -1) return;
    if (fromSectionIdx === toSectionIdx) return; // same section — SortableContext handles it

    const newData = current.map((s: any) => ({ ...s, tasks: [...s.tasks] }));
    const [movedTask] = newData[fromSectionIdx].tasks.splice(fromTaskIdx, 1);
    movedTask.section = newData[toSectionIdx].id;
    newData[toSectionIdx].tasks.splice(toTaskIdx, 0, movedTask);
    setDataAndRef(newData);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const current = dataRef.current;

    // Find current position of the dragged task
    let curSectionIdx = -1, curTaskIdx = -1;
    for (let i = 0; i < current.length; i++) {
      const idx = current[i].tasks.findIndex((t: Task) => t.id === activeId);
      if (idx !== -1) { curSectionIdx = i; curTaskIdx = idx; break; }
    }
    if (curSectionIdx === -1) return;

    const curSectionId = current[curSectionIdx].id;
    const wasCrossSectionMove = origSectionIdRef.current !== null &&
      origSectionIdRef.current !== curSectionId;

    if (wasCrossSectionMove) {
      // handleDragOver already updated local state — just persist with original source section
      const newData = current.map((s: any) => ({ ...s, tasks: [...s.tasks] }));
      const origSectionIdx = newData.findIndex((s: any) => s.id === origSectionIdRef.current);
      const origSection = origSectionIdx !== -1 ? newData[origSectionIdx] : newData[curSectionIdx];
      const destSection = newData[curSectionIdx];
      try {
        await updateKanbanPosition({
          resourceList: origSection.tasks,
          destinationList: destSection.tasks,
          resourceSectionId: origSection.id,
          destinationSectionId: destSection.id,
        });
      } catch (err) {
        toast.error("Failed to update task position");
        setData(props.data);
      }
      return;
    }

    // Same-section reorder — find target task index and use arrayMove
    let overTaskIdx = current[curSectionIdx].tasks.findIndex((t: Task) => t.id === overId);
    if (overTaskIdx === -1) return; // dropped on same task or no move

    const newData = current.map((s: any) => ({ ...s, tasks: [...s.tasks] }));
    newData[curSectionIdx].tasks = arrayMove(newData[curSectionIdx].tasks, curTaskIdx, overTaskIdx);
    setDataAndRef(newData);

    try {
      await updateKanbanPosition({
        resourceList: newData[curSectionIdx].tasks,
        destinationList: newData[curSectionIdx].tasks,
        resourceSectionId: curSectionId,
        destinationSectionId: curSectionId,
      });
    } catch (err) {
      toast.error("Failed to update task position");
      setData(props.data);
    }
  };

  const onDeleteSection = async () => {
    setIsLoadingSection(true);
    try {
      const result = await deleteSection(sectionId as unknown as string);
      if (result?.error) {
        toast.error(result.error);
      } else {
        const newData = [...data].filter((e) => e.id !== sectionId);
        setData(newData);
        toast.success("Section deleted successfully");
      }
    } catch (err) {
      toast.error("Something went wrong, during deleting section");
    } finally {
      setIsLoadingSection(false);
      setSectionId(null);
      setOpenSectionAlert(false);
      router.refresh();
    }
  };

  const updateSectionTitleHandler = async (
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
        const result = await updateSectionTitle({ sectionId, newTitle });
        if (result?.success) {
          toast.success("New section title saved in database");
        }
      } catch (err) {
        alert(err);
      }
    }, timeout);
  };

  const createTask = async (sectionId: string) => {
    try {
      await createTaskInBoard({
        boardId,
        section: sectionId,
      });
      toast.success("New task saved in database");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong, during creating task");
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const onDone = async (id: string) => {
    setIsLoading(true);
    try {
      await markTaskDone(id);
      toast.success("Success");
    } catch (error) {
      toast.error("Error");
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const onDelete = async () => {
    setOpen(false);
    setIsLoading(true);
    if (!selectedTask || !selectedTask.id || !selectedTask.section) {
      toast.error("Invalid task. Please select a valid task to delete.");
      setIsLoading(false);
      return;
    }
    try {
      const result = await deleteTask({
        id: selectedTask.id,
        section: selectedTask.section,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Task deleted successfully");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong, during deleting task");
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
          onDragOver={handleDragOver}
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
                        onChange={(e) =>
                          updateSectionTitleHandler(e, section.id)
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

                  <SortableContext
                    items={section.tasks.map((t: Task) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn id={section.id}>
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
                    </DroppableColumn>
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
