// Shared types for Task module components

export interface TaskUser {
  id: string;
  name: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: TaskUser;
  createdBy: TaskUser;
  documents: TaskDocument[];
  boardSection?: TaskBoardSection | null;
  history?: TaskHistory[];
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
  createdBy: string;
  access: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface TaskBoardSection {
  id: string;
  name: string;
  position: number;
  board?: BoardSummary | null;
}

export interface TaskDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  summary?: string | null;
  keyInsights?: string[] | null;
  confidence?: number | null;
  uploadedBy: string;
  taskId?: string | null;
  boardId?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskHistory {
  id: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date | null;
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
