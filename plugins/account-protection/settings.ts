import { z, type PluginContext } from "@nextcrm/plugin-sdk";

export const ACTIVITY_TYPES = ["call", "meeting", "note", "email", "visit"] as const;
const DEFAULT_CONTACT_TYPES = "visit,meeting";

const validTypes = (setting: string) =>
  setting.split(",").map((t) => t.trim()).filter((t) => (ACTIVITY_TYPES as readonly string[]).includes(t));

export const settingsSchema = z.object({
  protectionDays: z.number().int().min(1).default(90),
  contactDays: z.number().int().min(1).default(30),
  contactTypes: z.string()
    .refine((v) => validTypes(v).length > 0, `contactTypes needs at least one of: ${ACTIVITY_TYPES.join(", ")}`)
    .default(DEFAULT_CONTACT_TYPES),
  warnDays: z.number().int().min(1).default(7),
  defaultCountry: z.string().length(2).default("CZ"),
  requireNumber: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Ctx = PluginContext<Settings>;

// Unknown names are dropped (Ruling 5). A value with no valid type never reaches the activity query:
// it would drop the type filter and count any activity, so the default applies instead.
export function contactTypes(setting: string): string[] {
  const types = validTypes(setting);
  return types.length ? types : validTypes(DEFAULT_CONTACT_TYPES);
}
