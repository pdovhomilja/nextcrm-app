import { z } from "zod";
import { normalizePhone } from "./normalize";

export const SUMMARY_MAX = 4000;

const text = (max: number) => z.string().trim().min(1).max(max);

export const assistantInquirySchema = z.strictObject({
  idempotencyKey: text(200),
  source: z.enum(["website_chat", "voice_call"]),
  sessionId: text(200).optional(),
  contact: z
    .strictObject({
      name: text(200).optional(),
      email: z.string().trim().max(254).pipe(z.email()).optional(),
      phone: z
        .string()
        .max(40)
        .refine((p) => normalizePhone(p) !== null, "Not a valid phone number")
        .optional(),
      company: text(200).optional(),
    })
    .refine((c) => c.email || c.phone, {
      message: "At least one of email or phone is required",
    }),
  inquiry: z.strictObject({
    intent: z.enum(["sales", "support", "booking", "other"]),
    serviceInterest: text(200).optional(),
    summary: text(SUMMARY_MAX),
    urgency: z.enum(["normal", "urgent"]).default("normal"),
  }),
  booking: z
    .strictObject({
      calBookingUid: text(200).optional(),
      startTime: z.iso.datetime({ offset: true }).optional(),
    })
    .optional(),
});

export type AssistantInquiry = z.infer<typeof assistantInquirySchema>;
