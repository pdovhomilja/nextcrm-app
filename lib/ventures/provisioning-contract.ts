import { z } from "zod";

export const provisioningAdminRequestSchema = z.object({
  ventureKey: z.string().min(2).max(64),
  targetKey: z.string().min(2).max(32),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(200),
  idempotencyKey: z.string().uuid(),
  correlationId: z.string().uuid(),
});

export type ProvisioningAdminRequest = z.infer<typeof provisioningAdminRequestSchema>;

export const provisioningAdminResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(["seeded", "already_exists", "failed"]),
  venture: z.string().optional(),
  target: z.string().optional(),
  adminEmail: z.string().email().optional(),
  message: z.string(),
});

export type ProvisioningAdminResponse = z.infer<typeof provisioningAdminResponseSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  targetKey: z.string().optional(),
});
