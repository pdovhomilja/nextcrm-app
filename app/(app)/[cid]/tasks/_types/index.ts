// Shared types for Task module components

export interface TaskUser {
  name: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: TaskUser;
  createdBy: TaskUser;
}

export interface BoardSection {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description: string;
}

export interface TaskPosition {
  id: string;
  position: number;
}

export interface SectionPosition {
  id: string;
  position: number;
}

// Prisma enums
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ON_HOLD";
