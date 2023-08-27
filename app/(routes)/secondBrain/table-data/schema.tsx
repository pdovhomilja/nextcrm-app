import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const secondBrainSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  createdAt: z.string(),
  title: z.string(),
  urlShort: z.string(),
  url: z.string(),
});

export type SecondBrain = z.infer<typeof secondBrainSchema>;
