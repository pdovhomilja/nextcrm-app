import { z } from "zod";

export const DeleteContract = z.object({
  id: z.string(),
});
