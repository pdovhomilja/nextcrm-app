import { z } from "zod";

import { isValidGitRepositoryUrl, normalizeGitRepositoryUrl } from "@/lib/ventures/git-repo";
import { isValidVentureKey, normalizeVentureKey } from "@/lib/ventures/subdomain";

export const createVentureInputSchema = z.object({
  name: z.string().trim().min(2, "Venture name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Venture key is required.")
    .max(64)
    .refine((v) => isValidVentureKey(normalizeVentureKey(v)), {
      message: "Use lowercase letters, numbers, and hyphens (2–63 chars).",
    }),
  description: z.string().trim().min(10, "Description is required (min 10 characters).").max(2000),
  gitRepositoryUrl: z
    .string()
    .trim()
    .min(1, "Git repository URL is required.")
    .refine(isValidGitRepositoryUrl, {
      message: "Enter a valid GitHub, GitLab, or Bitbucket repository URL.",
    })
    .transform(normalizeGitRepositoryUrl),
  adminEmail: z.string().trim().email("Administrator email is required."),
  adminPassword: z.string().min(8, "Administrator password must be at least 8 characters.").max(200),
  envContent: z.string().trim().min(1, "Environment (.env) contents are required.").max(100_000),
  externalUrl: z.string().trim().url("Primary app URL must be a valid HTTPS URL."),
  notes: z.string().trim().min(1, "Project notes are required.").max(5000),
});

export type CreateVentureInput = z.infer<typeof createVentureInputSchema>;

/** Reserved keys for future venture modules (tasks, CI, releases). */
export const VENTURE_EXTENSIONS_VERSION = 1;

export function emptyVentureExtensions(): Record<string, unknown> {
  return {
    version: VENTURE_EXTENSIONS_VERSION,
    tasks: { enabled: false, provider: null },
    ci: { enabled: false },
    releases: { enabled: false },
  };
}
