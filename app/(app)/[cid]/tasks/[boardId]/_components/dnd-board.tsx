"use client";

import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import CreateTaskButton from "./create-task-button";
import TaskActions from "./task-actions";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User2 } from "lucide-react";
import CreateBoardSectionButton from "./create-board-section";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { updateSectionPositions } from "@/actions/tasks/update-section-position";
import {
  updateTaskPositions,
  moveTaskBetweenSections,
} from "@/actions/tasks/update-task-position";
import { useRouter } from "next/navigation";
import type { Task, BoardSection, Board } from "../../_types";

interface DndBoardProps {
  initialSections: BoardSection[];
  board: Board;
  boardId: string;
}

// Drop zone component for section top
function SectionDropZone({
  sectionId,
  isActive,
  className = "",
}: {
  sectionId: string;
  isActive: boolean;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isActive
          ? isOver
            ? "h-20 mx-2 mb-4 border-2 border-blue-500 border-dashed bg-blue-50 rounded-lg flex items-center justify-center shadow-lg"
            : "h-12 mx-2 mb-3 border-2 border-blue-300 border-dashed rounded-lg opacity-80 bg-blue-25"
          : "h-12 mx-2 mb-2 border border-gray-200 border-dashed rounded opacity-30"
      } ${className}`}
    >
      {isActive && isOver && (
        <div className="flex flex-col items-center gap-1 px-4 py-2">
          <span className="text-lg text-blue-600 font-semibold">
            📋 Drop task here
          </span>
          <span className="text-sm text-blue-500">
            (will be added to top of section)
          </span>
        </div>
      )}
      {isActive && !isOver && (
        <div className="flex items-center justify-center h-full">
          <span className="text-blue-400 font-medium">Drop zone</span>
        </div>
      )}
      {!isActive && !isOver && (
        <div className="flex items-center justify-center h-full">
          <span className="text-grey-400 font-medium">Drop zone</span>
        </div>
      )}
    </div>
  );
}

function SortableSection({
  section,
  onTaskCreated,
  activeId,
}: {
  section: BoardSection;
  onTaskCreated?: (newTask: Task, sectionId: string) => Promise<void>;
  activeId?: string | null;
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

  // Check if we're dragging a task (not a section)
  const isDraggingTask = Boolean(
    activeId && !section.tasks.some((t) => t.id === activeId)
  );

  // Determine if this is a valid drop zone
  const isValidDropZone = isDraggingTask && !isDragging;
  const showDropIndicator = isValidDropZone && isOver;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`max-w-md min-w-[300px] transition-all duration-200 ${
        showDropIndicator
          ? "ring-4 ring-blue-500 ring-opacity-50 bg-blue-50 border-blue-300"
          : isValidDropZone
          ? "border-blue-200 border-dashed border-2"
          : ""
      }`}
      {...attributes}
    >
      <CardHeader
        {...listeners}
        className={`${showDropIndicator ? "bg-blue-100" : ""}`}
      >
        <CardTitle
          className={`cursor-grab flex items-center gap-2 ${
            showDropIndicator ? "text-blue-700" : ""
          }`}
        >
          {section.name}
          {showDropIndicator && (
            <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded">
              Drop here!
            </span>
          )}
          {isValidDropZone && !showDropIndicator && (
            <span className="text-xs text-blue-500 opacity-70">
              (Drop zone)
            </span>
          )}
        </CardTitle>
        <CreateTaskButton
          boardSectionId={section.id}
          onTaskCreated={onTaskCreated}
        />
      </CardHeader>
      <CardContent
        className={`flex flex-col min-h-[120px] p-4 ${
          showDropIndicator ? "bg-blue-50" : ""
        }`}
      >
        {/* Prominent drop zone at top of section */}
        <SectionDropZone sectionId={section.id} isActive={isDraggingTask} />
        {/* Tasks with better spacing */}
        <div className="space-y-3">
          {section.tasks.map((task) => (
            <SortableContext
              key={task.id}
              items={[task.id]}
              strategy={verticalListSortingStrategy}
            >
              <SortableTask task={task} />
            </SortableContext>
          ))}
        </div>
        {/* Empty state message */}
        {section.tasks.length === 0 && !isDraggingTask && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-8">
            No tasks yet
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  return (
    <Card ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardHeader className="flex flex-row justify-between cursor-grab">
        <CardTitle>{task.title}</CardTitle>
        <TaskActions taskId={task.id} taskName={task.title} />
      </CardHeader>
      <CardContent className="flex flex-col justify-between space-y-2">
        <p>{task.description}</p>
        <div className="flex flex-row gap-2 items-center text-xs text-muted-foreground">
          <User2 size={16} />
          <p>{task.assignedTo.name || "Unassigned"}</p>
        </div>
        <div className="flex flex-row gap-2">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Status: {task.status}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Priority: {task.priority}
          </Badge>
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

// Utility functions for drop zone ID parsing
const parseDropZoneId = (id: string) => {
  // Check for section drop zone: "section-drop-{sectionId}"
  const sectionDropMatch = id.match(/^section-drop-(.+)$/);
  if (sectionDropMatch) {
    return {
      sectionId: sectionDropMatch[1],
      insertionIndex: 0, // Always insert at top
      isDropZone: true,
      isSectionDrop: true,
    };
  }

  // Legacy drop zone support (if any remain)
  const legacyMatch = id.match(/^(.+)-drop-(\d+)$/);
  if (legacyMatch) {
    return {
      sectionId: legacyMatch[1],
      insertionIndex: parseInt(legacyMatch[2], 10),
      isDropZone: true,
      isSectionDrop: false,
    };
  }

  return {
    sectionId: id,
    insertionIndex: -1,
    isDropZone: false,
    isSectionDrop: false,
  };
};

const isTaskId = (id: string, sections: BoardSection[]) => {
  return sections.some((section) =>
    section.tasks.some((task) => task.id === id)
  );
};

const isSectionId = (id: string, sections: BoardSection[]) => {
  return sections.some((section) => section.id === id);
};

// Custom collision detection for precise insertion points
const customCollisionDetection: CollisionDetection = (args) => {
  const { active, droppableContainers } = args;
  const activeId = active.id as string;

  // Check if we're dragging a task (not a section)
  const isDraggingTask = !activeId.includes("-drop-") && activeId.length > 20;

  if (!isDraggingTask) {
    // For section dragging, use default collision detection
    return closestCorners(args);
  }

  // For task dragging, first try to find drop zone intersections
  const pointerIntersections = pointerWithin(args);
  const rectIntersections = rectIntersection(args);

  // Combine both intersection methods for better coverage
  const allIntersections = [
    ...pointerIntersections,
    ...rectIntersections.filter(
      (rect) => !pointerIntersections.some((pointer) => pointer.id === rect.id)
    ),
  ];

  console.log("🎯 Collision detection debug:", {
    activeId,
    totalDroppables: droppableContainers.length,
    allIntersections: allIntersections.map((i) => ({
      id: i.id,
      type: i.id.toString().startsWith("section-drop-")
        ? "section-drop"
        : i.id.toString().includes("-drop-")
        ? "legacy-drop"
        : "other",
    })),
  });

  // Prioritize section drop zones first
  const sectionDropZones = allIntersections.filter((intersection) =>
    intersection.id.toString().startsWith("section-drop-")
  );

  if (sectionDropZones.length > 0) {
    console.log("✅ Found section drop zone:", sectionDropZones[0].id);
    return [sectionDropZones[0]];
  }

  // Then check legacy drop zones
  const legacyDropZones = allIntersections.filter(
    (intersection) =>
      intersection.id.toString().includes("-drop-") &&
      !intersection.id.toString().startsWith("section-drop-")
  );

  if (legacyDropZones.length > 0) {
    console.log("✅ Found legacy drop zone:", legacyDropZones[0].id);
    return [legacyDropZones[0]];
  }

  // Check for section intersections as fallback
  const sectionIntersections = allIntersections.filter((intersection) => {
    const id = intersection.id.toString();
    // Accept section IDs (should start with 'cmd' and be long) but not task IDs
    return !id.includes("-drop-") && id.startsWith("cmd") && id.length > 15;
  });

  if (sectionIntersections.length > 0) {
    console.log("📦 Found section:", sectionIntersections[0].id);
    return [sectionIntersections[0]];
  }

  // Also check for any task intersections as last resort (for same-section reordering)
  const taskIntersections = allIntersections.filter((intersection) => {
    const id = intersection.id.toString();
    return id.startsWith("cmd") && id.length > 15 && id !== activeId; // Different task
  });

  if (taskIntersections.length > 0) {
    console.log("📋 Found task:", taskIntersections[0].id);
    return [taskIntersections[0]];
  }

  console.log("❌ No valid drop target found, details:", {
    allIntersections: allIntersections.map((i) => i.id),
    activeId,
  });
  return [];
};

export default function DndBoard({
  initialSections,
  board,
  boardId,
}: DndBoardProps) {
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

  const handleSectionCreated = async (newSection: BoardSection) => {
    // Add the new section to the local state
    setSections((prev) => [...prev, newSection]);
  };

  const handleTaskCreated = async (newTask: Task, sectionId: string) => {
    // Add the new task to the appropriate section
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, tasks: [...section.tasks, newTask] }
          : section
      )
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    setActiveId(activeId);
    setError(null); // Clear any previous errors
    // Store the current sections state for accurate position calculations
    setSectionsAtDragStart([...sections]);
  };

  const handleDragOver = (event: DragOverEvent) => {
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

    // Parse the drop target
    const dropInfo = parseDropZoneId(overId);
    let targetSection: BoardSection | undefined;
    let insertionIndex: number;

    if (dropInfo.isDropZone) {
      // Dropping on a specific drop zone
      targetSection = sections.find((s) => s.id === dropInfo.sectionId);
      insertionIndex = dropInfo.insertionIndex;
    } else if (isTaskId(overId, sections)) {
      // Dropping on a task - insert before that task
      targetSection = sections.find((s) =>
        s.tasks.some((t) => t.id === overId)
      );
      if (targetSection) {
        insertionIndex = targetSection.tasks.findIndex((t) => t.id === overId);
      } else {
        return;
      }
    } else if (isSectionId(overId, sections)) {
      // Dropping on a section - append to end
      targetSection = sections.find((s) => s.id === overId);
      if (targetSection) {
        insertionIndex = targetSection.tasks.length;
      } else {
        return;
      }
    } else {
      return;
    }

    if (!targetSection) return;

    // Calculate the new task arrangement
    const taskToMove = activeTask;
    let newActiveTasks = activeSection.tasks;
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
      // Cross-section move
      newActiveTasks = activeSection.tasks.filter((t) => t.id !== activeId);
      newTargetTasks = [...targetSection.tasks];
      newTargetTasks.splice(insertionIndex, 0, taskToMove);
    }

    // Update the sections state
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === activeSection.id && s.id === targetSection.id) {
          // Same section
          return { ...s, tasks: newTargetTasks };
        } else if (s.id === activeSection.id) {
          // Source section
          return { ...s, tasks: newActiveTasks };
        } else if (s.id === targetSection.id) {
          // Target section
          return { ...s, tasks: newTargetTasks };
        }
        return s;
      })
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log("❌ Drag ended with no drop target");
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log("🎯 Drag end event:", { activeId, overId });

    // Use the sections state from when drag started for position calculations
    const originalSections = sectionsAtDragStart;

    // Check if it's a section being dragged
    if (isSectionId(activeId, sections)) {
      const activeSectionIndex = sections.findIndex((s) => s.id === activeId);
      const overSectionIndex = sections.findIndex((s) => s.id === overId);

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

    // Parse the final drop target to get precise insertion position
    const dropInfo = parseDropZoneId(overId);
    console.log("🔍 Drop zone parsing:", { overId, dropInfo });

    let originalTargetSection: BoardSection | undefined;
    let finalInsertionIndex: number;

    if (dropInfo.isDropZone) {
      // Dropped on a specific drop zone
      originalTargetSection = originalSections.find(
        (s) => s.id === dropInfo.sectionId
      );
      finalInsertionIndex = dropInfo.insertionIndex;
      console.log("📍 Drop zone target found:", {
        sectionId: dropInfo.sectionId,
        targetFound: !!originalTargetSection,
        insertionIndex: finalInsertionIndex,
      });
    } else if (isTaskId(overId, originalSections)) {
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
    } else if (isSectionId(overId, originalSections)) {
      // Dropped on a section - append to end
      originalTargetSection = originalSections.find((s) => s.id === overId);
      if (originalTargetSection) {
        finalInsertionIndex = originalTargetSection.tasks.length;
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

      console.log("🔄 Starting operation:", {
        activeSection: originalActiveSection.id,
        targetSection: originalTargetSection.id,
        isSameSection: originalActiveSection.id === originalTargetSection.id,
        dropInfo,
      });

      if (originalActiveSection.id === originalTargetSection.id) {
        // Same section - only reorder if it's not a section drop zone
        if (dropInfo.isSectionDrop) {
          console.log("📍 Same section drop zone - no action needed");
          // Task is already in this section, no need to move
        } else {
          console.log("↔️ Same section reorder");
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
            console.log("📊 Task updates:", taskUpdates);
            await updateTaskPositions(taskUpdates);
          }
        }
      } else {
        // Move between sections - always to top
        console.log("🔄 Cross-section move to top");
        await moveTaskBetweenSections(
          activeId,
          originalActiveSection.id,
          originalTargetSection.id
        );
      }

      console.log("✅ Operation completed, refreshing...");
      router.refresh();
    } catch (error) {
      console.error("Drag operation failed:", error);
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
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {board.name}
        </h1>
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
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-row gap-2  overflow-x-auto">
          <SortableContext
            items={sections}
            strategy={horizontalListSortingStrategy}
          >
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                onTaskCreated={handleTaskCreated}
                activeId={activeId}
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
