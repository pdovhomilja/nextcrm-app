export interface $DbEnums {}


export namespace $DbEnums {
  type UserRole = "USER" | "CONTRIBUTOR" | "EDITOR" | "MEDIA" | "ADMIN"
  type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  type TaskStatusNew = "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD"
}
