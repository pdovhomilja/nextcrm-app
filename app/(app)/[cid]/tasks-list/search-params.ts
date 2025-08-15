import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsStringEnum,
} from "nuqs/server";

export const taskTableSearchParams = createSearchParamsCache({
  // Search and filtering
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault("all"),
  priority: parseAsString.withDefault("all"),
  dueDate: parseAsString.withDefault("all"),

  // Sorting
  sortBy: parseAsStringEnum([
    "title",
    "status",
    "priority",
    "dueDate",
    "createdAt",
    "updatedAt",
  ]).withDefault("updatedAt"),
  sortOrder: parseAsStringEnum(["asc", "desc"]).withDefault("desc"),

  // Pagination
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
});

export type TaskTableSearchParams = typeof taskTableSearchParams;
