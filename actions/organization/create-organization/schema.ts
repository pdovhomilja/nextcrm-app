import { z } from "zod";

export const CreateOrganization = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters").max(100),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});
