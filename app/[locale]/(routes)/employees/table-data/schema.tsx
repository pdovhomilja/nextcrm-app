import { z } from "zod";

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const employeeSchema = z.object({
  //TODO: fix all the types and nullable
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  position: z.string().nullable()

});

export type Employee = z.infer<typeof employeeSchema>;
