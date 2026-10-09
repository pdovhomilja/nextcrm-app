import { z, type PluginContext } from "@nextcrm/plugin-sdk";

export const ACTIVITY_TYPES = ["call", "meeting", "note", "email", "visit"] as const;

export const settingsSchema = z.object({
  protectionDays: z.number().int().min(1).default(90),
  contactDays: z.number().int().min(1).default(30),
  contactTypes: z.string().default("visit,meeting"),
  warnDays: z.number().int().min(1).default(7),
  defaultCountry: z.string().length(2).default("CZ"),
  requireNumber: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Ctx = PluginContext<Settings>;

// The platform validates settings field by field, so unknown names are dropped here (Ruling 5).
export function contactTypes(setting: string): string[] {
  return setting.split(",").map((t) => t.trim()).filter((t) => (ACTIVITY_TYPES as readonly string[]).includes(t));
}
