import { z, type PluginContext } from "@nextcrm/plugin-sdk";

export const settingsSchema = z.object({
  url: z.string().regex(/^https:\/\/[^\s/]+/, "An https URL, e.g. https://odoo.example.com"),
  database: z.string().min(1),
  syncMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCountry: z.string().length(2).default("CZ"),
  dryRun: z.boolean().default(true),
});
export const secretsSchema = z.object({ apiKey: z.string().min(1) });

export type Settings = z.infer<typeof settingsSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type Ctx = PluginContext<Settings, Secrets>;
