import { z } from "zod";

export const websiteLeadIntakeSchema = z.object({
  externalId: z.string().uuid(),
  source: z.string().min(1).max(200),
  submittedAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(40),
  country: z.string().trim().min(1).max(80),
  serviceRequired: z.string().trim().min(1).max(120),
  projectType: z.string().trim().min(1).max(120),
  budgetRange: z.string().trim().max(120).optional(),
  description: z.string().trim().min(1).max(5000),
});

export type WebsiteLeadIntakeInput = z.infer<typeof websiteLeadIntakeSchema>;

export function splitPersonName(fullName: string): { firstName?: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lastName: parts[0] ?? fullName.trim() };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]!,
  };
}

export function buildWebsiteLeadDescription(input: WebsiteLeadIntakeInput): string {
  const lines = [
    input.description,
    "",
    `Country: ${input.country}`,
    `Service: ${input.serviceRequired}`,
    `Project type: ${input.projectType}`,
  ];
  if (input.budgetRange?.trim()) {
    lines.push(`Budget: ${input.budgetRange.trim()}`);
  }
  lines.push(`Submitted: ${input.submittedAt}`);
  lines.push(`Source: ${input.source}`);
  return lines.join("\n");
}
