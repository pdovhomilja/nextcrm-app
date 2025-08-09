import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const tasksSearchParams = createSearchParamsCache({
  q: parseAsString.withDefault(""),
});
