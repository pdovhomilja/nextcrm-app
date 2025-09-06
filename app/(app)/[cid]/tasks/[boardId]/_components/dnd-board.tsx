"use client";

import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import React, { useCallback, useEffect, useState } from "react";
import CreateTaskButton from "./create-task-button";
import TaskActions from "./task-actions";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { GripVertical, User2, X } from "lucide-react";
import CreateBoardSectionButton from "./create-board-section";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
// Modifiers like autoScroll are not available in our current version; skipping for now
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateSectionPositions } from "@/actions/tasks/update-section-position";
import {
  updateTaskPositions,
  moveTaskBetweenSectionsAtPosition,
} from "@/actions/tasks/update-task-position";
import { useRouter } from "next/navigation";
import type { Task, BoardSection, Board } from "../../_types";
import { deleteBoardSection } from "@/actions/tasks/delete-board-section";
import { toast } from "sonner";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface DndBoardProps {
  initialSections: BoardSection[];
  board: Board;
  boardId: string;
}

function SortableSection({
  section,
  onTaskCreated,
  boardId,
  onSectionDeleted,
}: {
  section: BoardSection;
  onTaskCreated?: (newTask: Task, sectionId: string) => Promise<void>;
  activeId?: string | null;
  boardId: string;
  onSectionDeleted: (sectionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`max-w-md min-w-[300px] will-change-transform transform-gpu transition-[transform,opacity] duration-200 ease-out ${
        isOver ? "ring-4 ring-blue-500/40 bg-blue-50" : ""
      }`}
      {...attributes}
    >
      <CardHeader>
        <CardTitle className={"flex items-center justify-between p-2 gap-2"}>
          <span className="flex items-center gap-2">
            <span
              {...listeners}
              {...attributes}
              role="button"
              tabIndex={0}
              aria-roledescription="Draggable section"
              aria-label={`Drag handle for section ${section.name}`}
              className="cursor-grab active:cursor-grabbing inline-flex"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </span>
            <span>
              {section.name}({section.tasks.length})
            </span>
          </span>
          <X
            className="w-4 h-4"
            aria-label="Delete section"
            onClick={async () => {
              const res = await deleteBoardSection(section.id, boardId);
              if (res.message) {
                toast.error(res.message);
              } else {
                toast.success("Board section deleted successfully");
                onSectionDeleted(section.id);
              }
            }}
          />
        </CardTitle>

        {/* <span>{section.id}</span> */}
        <CreateTaskButton
          boardSectionId={section.id}
          onTaskCreated={onTaskCreated}
        />
      </CardHeader>
      <CardContent className={"flex flex-col min-h-[120px] p-4"}>
        {/* Invisible droppable container for cross-section target */}
        <SectionTasksDroppableContainer sectionId={section.id} />
        <SortableContext
          items={section.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 select-none">
            {section.tasks.map((task) => (
              <SortableTask key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
        {/* Empty state message */}
        {section.tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-8">
            No tasks yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function SectionTasksDroppableContainer({ sectionId }: { sectionId: string }) {
  const { setNodeRef } = useDroppable({ id: `section-container-${sectionId}` });
  return <div ref={setNodeRef} className="h-2" />;
}

function SortableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!task) return null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="will-change-transform transform-gpu transition-[transform,opacity] duration-150 ease-out"
    >
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            {...listeners}
            {...attributes}
            role="button"
            tabIndex={0}
            aria-roledescription="Draggable task"
            aria-label={`Drag handle for task ${task.title}`}
            className="cursor-grab active:cursor-grabbing inline-flex"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </span>
          <CardTitle>{task.title}</CardTitle>
        </div>
        <TaskActions task={task} />
      </CardHeader>
      <CardContent className="flex flex-col justify-between space-y-2 overflow-hidden text-xs mx-2">
        <p className="truncate">
          <HoverCard>
            <HoverCardTrigger>{task.description}</HoverCardTrigger>
            <HoverCardContent className="text-xs">
              {task.description}
            </HoverCardContent>
          </HoverCard>
        </p>
        <div className="flex flex-row gap-2 items-center text-xs text-muted-foreground">
          <User2 size={16} />
          <p>{task.assignedTo.name || "Unassigned"}</p>
        </div>
        <div className="flex flex-row gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Status: {task.status}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Priority: {task.priority}
          </Badge>
          {task.dueDate && (
            <Badge
              variant="outline"
              className={`text-xs ${
                new Date(task.dueDate) <
                new Date(new Date().setHours(0, 0, 0, 0))
                  ? "border-red-300 text-red-600"
                  : "text-muted-foreground"
              }`}
              title={format(task.dueDate, "PPP")}
            >
              Due: {format(task.dueDate, "MMM d")}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-row justify-between">
        <p className="text-xs text-muted-foreground">
          Created: {formatDistanceToNowStrict(task.createdAt)} ago
        </p>
        <p className="text-xs text-muted-foreground">
          Updated: {formatDistanceToNowStrict(task.updatedAt)} ago
        </p>
      </CardFooter>
    </Card>
  );
}

const MemoSortableSection = React.memo(SortableSection);

const isTaskId = (id: string, sections: BoardSection[]) => {
  return sections.some((section) =>
    section.tasks.some((task) => task.id === id)
  );
};

const isSectionId = (id: string, sections: BoardSection[]) => {
  return sections.some((section) => section.id === id);
};

function parseSectionContainerOverId(overId: string): string | null {
  const match = overId.match(/^section-container-(.+)$/);
  return match ? match[1] : null;
}

// No custom collision detection; rely on closestCorners for simplicity and accuracy

export default function DndBoard({ initialSections, boardId }: DndBoardProps) {
  const [sections, setSections] = useState(initialSections);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sectionsAtDragStart, setSectionsAtDragStart] = useState<
    BoardSection[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sync sections state when initialSections prop changes
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const handleSectionCreated = useCallback(async (newSection: BoardSection) => {
    // Add the new section to the local state
    setSections((prev: BoardSection[]) => [...prev, newSection]);
  }, []);

  const handleSectionDeleted = useCallback(
    (sectionId: string) => {
      setSections((prev: BoardSection[]) =>
        prev.filter((s) => s.id !== sectionId)
      );
      router.refresh();
    },
    [router]
  );

  const handleTaskCreated = useCallback(
    async (newTask: Task, sectionId: string) => {
      // Add the new task to the appropriate section
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, tasks: [...section.tasks, newTask] }
            : section
        )
      );
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Enter"],
        cancel: ["Escape"],
        end: ["Enter"],
      },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string;
      setActiveId(activeId);
      setError(null); // Clear any previous errors
      // Store the current sections state for accurate position calculations
      setSectionsAtDragStart([...sections]);
    },
    [sections]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Only handle task dragging (not section dragging)
      if (!isTaskId(activeId, sections)) return;

      const activeTask = sections
        .flatMap((s) => s.tasks)
        .find((t) => t.id === activeId);
      if (!activeTask) return;

      // Find the section that contains the task being dragged
      const activeSection = sections.find((s) =>
        s.tasks.some((t) => t.id === activeId)
      );
      if (!activeSection) return;

      // Determine target and insertion index
      let targetSection: BoardSection | undefined;
      let insertionIndex: number;

      const containerSectionId = parseSectionContainerOverId(overId);

      if (isTaskId(overId, sections)) {
        // Dropping on a task - insert before that task
        targetSection = sections.find((s) =>
          s.tasks.some((t) => t.id === overId)
        );
        if (targetSection) {
          insertionIndex = targetSection.tasks.findIndex(
            (t) => t.id === overId
          );
        } else {
          return;
        }
      } else if (
        containerSectionId &&
        isSectionId(containerSectionId, sections)
      ) {
        // Dropping on the section's container top area
        targetSection = sections.find((s) => s.id === containerSectionId);
        if (targetSection) {
          insertionIndex = 0;
        } else {
          return;
        }
      } else if (isSectionId(overId, sections)) {
        // Dropping on a section container - insert at top
        targetSection = sections.find((s) => s.id === overId);
        if (targetSection) {
          insertionIndex = 0;
        } else {
          return;
        }
      } else {
        return;
      }

      if (!targetSection) return;

      // Calculate the new task arrangement

      let newTargetTasks = targetSection.tasks;

      if (activeSection.id === targetSection.id) {
        // Same section reordering
        const currentIndex = activeSection.tasks.findIndex(
          (t) => t.id === activeId
        );
        if (currentIndex === -1) return;

        // Adjust insertion index if moving within the same section
        let adjustedInsertionIndex = insertionIndex;
        if (currentIndex < insertionIndex) {
          adjustedInsertionIndex = insertionIndex - 1;
        }

        if (currentIndex !== adjustedInsertionIndex) {
          newTargetTasks = arrayMove(
            activeSection.tasks,
            currentIndex,
            adjustedInsertionIndex
          );
        }
      } else {
        // Cross-section move: do not mutate state during drag; only update on drop
        return;
      }

      // Update the sections state (only for same-section reorder)
      setSections((prev) =>
        prev.map((s) =>
          s.id === activeSection.id ? { ...s, tasks: newTargetTasks } : s
        )
      );
    },
    [sections]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) {
        console.log("❌ Drag ended with no drop target");
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // Use the sections state from when drag started for position calculations
      const originalSections = sectionsAtDragStart;

      // Check if it's a section being dragged
      if (isSectionId(activeId, sections)) {
        const activeSectionIndex = sections.findIndex((s) => s.id === activeId);
        const normalizedOverId = parseSectionContainerOverId(overId) ?? overId;
        const overSectionIndex = sections.findIndex(
          (s) => s.id === normalizedOverId
        );

        if (activeSectionIndex !== overSectionIndex) {
          const newSections = arrayMove(
            sections,
            activeSectionIndex,
            overSectionIndex
          );
          setSections(newSections);

          // Update positions in database
          const updates = newSections.map(
            (section: BoardSection, index: number) => ({
              id: section.id,
              position: index,
            })
          );

          try {
            setIsLoading(true);
            await updateSectionPositions(updates);
            router.refresh();
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update section positions";
            setError(errorMessage);
            setSections(sections); // Revert on error
          } finally {
            setIsLoading(false);
          }
        }
        return;
      }

      // Handle task drag end
      if (!isTaskId(activeId, originalSections)) {
        return;
      }

      const activeTask = originalSections
        .flatMap((s) => s.tasks)
        .find((t) => t.id === activeId);
      if (!activeTask) {
        return;
      }

      const originalActiveSection = originalSections.find((s) =>
        s.tasks.some((t) => t.id === activeId)
      );
      if (!originalActiveSection) {
        return;
      }

      let originalTargetSection: BoardSection | undefined;
      let finalInsertionIndex: number;

      const containerSectionIdEnd = parseSectionContainerOverId(overId);

      if (isTaskId(overId, originalSections)) {
        // Dropped on a task - insert before that task
        originalTargetSection = originalSections.find((s) =>
          s.tasks.some((t) => t.id === overId)
        );
        if (originalTargetSection) {
          finalInsertionIndex = originalTargetSection.tasks.findIndex(
            (t) => t.id === overId
          );
        } else {
          return;
        }
      } else if (
        containerSectionIdEnd &&
        isSectionId(containerSectionIdEnd, originalSections)
      ) {
        // Dropped on the section's container top area
        originalTargetSection = originalSections.find(
          (s) => s.id === containerSectionIdEnd
        );
        if (originalTargetSection) {
          finalInsertionIndex = 0;
        } else {
          return;
        }
      } else if (isSectionId(overId, originalSections)) {
        // Dropped on a section container - insert at top
        originalTargetSection = originalSections.find((s) => s.id === overId);
        if (originalTargetSection) {
          finalInsertionIndex = 0;
        } else {
          return;
        }
      } else {
        return;
      }

      if (!originalTargetSection) {
        return;
      }

      try {
        setIsLoading(true);

        if (originalActiveSection.id === originalTargetSection.id) {
          // Same section reorder - persist current order of that section
          const currentSection = sections.find(
            (s) => s.id === originalActiveSection.id
          );
          if (currentSection) {
            const taskUpdates = currentSection.tasks.map(
              (task: Task, index: number) => ({
                id: task.id,
                position: index,
              })
            );
            await updateTaskPositions(taskUpdates);
          }
        } else {
          // Cross-section move: optimistic local update before persisting
          setSections((prev) => {
            const next: BoardSection[] = prev.map((s) => ({
              ...s,
              tasks: [...s.tasks],
            }));
            const source = next.find((s) => s.id === originalActiveSection.id);
            const target = next.find((s) => s.id === originalTargetSection.id);
            if (!source || !target) return prev;
            // Remove from source
            const removedIndex = source.tasks.findIndex(
              (t) => t.id === activeId
            );
            if (removedIndex !== -1) {
              const [removed] = source.tasks.splice(removedIndex, 1);
              // Insert into target at finalInsertionIndex (clamped)
              const insertIndex = Math.max(
                0,
                Math.min(target.tasks.length, finalInsertionIndex)
              );
              target.tasks.splice(insertIndex, 0, removed);
            }
            return next;
          });

          await moveTaskBetweenSectionsAtPosition(
            activeId,
            originalActiveSection.id,
            originalTargetSection.id,
            finalInsertionIndex
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update task positions";
        setError(errorMessage);
        // Revert changes on error
        setSections(sectionsAtDragStart);
      } finally {
        setIsLoading(false);
      }
    },
    [sections, sectionsAtDragStart, router]
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            Saving...
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
            <span className="text-red-500">⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-row gap-2">
        <CreateBoardSectionButton
          boardId={boardId}
          onSectionCreated={handleSectionCreated}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-row gap-2 overflow-x-auto overscroll-x-contain">
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sections.map((section) => (
              <MemoSortableSection
                key={section.id}
                section={section}
                onTaskCreated={handleTaskCreated}
                activeId={activeId}
                boardId={boardId}
                onSectionDeleted={handleSectionDeleted}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeId
            ? (() => {
                const section = sections.find((s) => s.id === activeId);
                if (section) {
                  return (
                    <Card className="max-w-md min-w-[300px] rotate-5">
                      <CardHeader>
                        <CardTitle>{section.name}</CardTitle>
                      </CardHeader>
                    </Card>
                  );
                }

                const task = sections
                  .flatMap((s) => s.tasks)
                  .find((t) => t.id === activeId);
                if (task) {
                  return (
                    <Card className="rotate-5">
                      <CardHeader>
                        <CardTitle>{task.title}</CardTitle>
                      </CardHeader>
                    </Card>
                  );
                }
                return null;
              })()
            : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
