import "vitest";

declare module "vitest" {
  interface TaskMeta {
    id?: string;
    endpoint?: string;
    objective?: string;
    expectedStatus?: number | string;
    body?: Record<string, any> | string;
    params?: Record<string, any> | string;
    notes?: string;
  }
}
