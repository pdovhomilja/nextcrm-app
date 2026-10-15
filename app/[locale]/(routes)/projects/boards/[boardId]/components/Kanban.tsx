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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SCRUM_BOARD_SECTIONS } from "@/lib/projects/board-templates";
import AlertModal from "@/components/modals/alert-modal";
import { Skeleton } from "@/components/ui/skeleton";
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

  const title = task.title === "" || !task.title ? "Untitled" : task.title;
  const dueMs = task.dueDateAt ? new Date(task.dueDateAt).getTime() : null;
  const priorityClass =
    task.priority === "high"
      ? "text-red-600"
      : task.priority === "normal"
        ? "text-amber-600"
        : task.priority === "low"
          ? "text-emerald-600"
          : "text-muted-foreground";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-2 w-full cursor-grab border-border/80 shadow-sm active:cursor-grabbing"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-sm font-semibold leading-snug">{title}</CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {dueMs && task.taskStatus !== "COMPLETE" && dueMs < currentTime && (
            <HoverCard>
              <HoverCardTrigger>
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
              </HoverCardTrigger>
              <HoverCardContent>This task is overdue.</HoverCardContent>
            </HoverCard>
          )}
          {task.taskStatus === "COMPLETE" && (
            <Check className="h-4 w-4 text-emerald-600" aria-label="Done" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded p-1 hover:bg-muted">
                <DotsHorizontalIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem
                className="gap-2"
                onClick={() => router.push(`/projects/tasks/viewtask/${task.id}`)}
              >
                <EyeIcon className="h-4 w-4 opacity-50" />
                View
              </DropdownMenuItem>
              {task.taskStatus !== "COMPLETE" && (
                <DropdownMenuItem className="gap-2" onClick={() => onEdit(task)}>
                  <Pencil className="h-4 w-4 opacity-50" />
                  Edit
                </DropdownMenuItem>
              )}
              {task.taskStatus !== "COMPLETE" && (
                <DropdownMenuItem className="gap-2" onClick={() => onDone(task.id)}>
                  <Check className="h-4 w-4 opacity-50" />
                  Mark as done
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2" onClick={() => onDelete(task)}>
                <TrashIcon className="h-4 w-4 opacity-50" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0 text-xs text-muted-foreground">
        {dueMs ? (
          <p>
            Due{" "}
            <span className={dueMs < currentTime && task.taskStatus !== "COMPLETE" ? "text-red-600" : ""}>
              {moment(task.dueDateAt).format("MMM D, YYYY")}
            </span>
          </p>
        ) : null}
        {task.priority ? (
          <p className={priorityClass}>Priority: {task.priority}</p>
        ) : null}
        {task.content ? (
          <HoverCard>
            <HoverCardTrigger className="line-clamp-3 text-left text-foreground/80">
              {task.content}
            </HoverCardTrigger>
            <HoverCardContent className="max-w-sm">{task.content}</HoverCardContent>
          </HoverCard>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] flex-1 rounded-md transition-colors ${
        isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
      }`}
    >
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

  if (isLoading) return (
    <div className="flex flex-col gap-2 py-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );

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
      <div className="flex min-h-0 flex-1 flex-col gap-3">
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

        {data?.length <= 2 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            This board is still minimal. Use{" "}
            <strong className="font-medium text-foreground">Add Scrum columns</strong> in the toolbar
            to add {SCRUM_BOARD_SECTIONS.join(", ")} — same layout as the CRM pipeline board.
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{data?.length ?? 0} columns</Badge>
          <span>Drag cards between columns · click + to add a task</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-h-[min(70vh,720px)] w-full gap-3 overflow-x-auto pb-4">
            {data?.map((section: any) => (
              <Card
                key={section.id}
                className="flex h-full w-[min(100%,320px)] min-w-[280px] shrink-0 flex-col overflow-hidden bg-muted/20"
              >
                <CardHeader className="space-y-0 border-b border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={section?.title}
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-semibold"
                      placeholder="Column name"
                      onChange={(e) => updateSectionTitleHandler(e, section.id)}
                    />
                    <Badge variant="outline">{section?.tasks?.length ?? 0}</Badge>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete column"
                      onClick={() => {
                        setSectionId(section.id);
                        setOpenSectionAlert(true);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
                  <SortableContext
                    items={section.tasks.map((t: Task) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn id={section.id}>
                      {section.tasks?.length ? (
                        section.tasks.map((task: any) => (
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
                        ))
                      ) : (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          No tasks yet
                        </p>
                      )}
                    </DroppableColumn>
                  </SortableContext>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-auto w-full gap-2 border-dashed"
                    onClick={() => createTask(section.id)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add task
                  </Button>
                </CardContent>
              </Card>
            ))}

            <button
              type="button"
              className="flex h-[min(70vh,720px)] w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              onClick={() => setSectionOpenDialog(true)}
              aria-label="Add column"
            >
              <PlusCircle className="h-8 w-8" />
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">Column</span>
            </button>
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="w-[280px] opacity-90 shadow-lg">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">
                    {activeTask.title === "" || !activeTask.title ? "Untitled" : activeTask.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
};

export default Kanban;
