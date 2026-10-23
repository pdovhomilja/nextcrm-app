"use server";

import { revalidatePath } from "next/cache";
import { HrmCandidateStatus, HrmEmploymentType } from "@prisma/client";
import { requireFeature } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { persistAttachmentBuffer } from "@/lib/email/persist-attachment";
import { sendMailViaResend } from "@/lib/email/resend-mail";
import { getAppName } from "@/lib/app-name";
import { extractResumeProfile } from "@/lib/hrm/extract-resume";
import { isEmploymentType, type EmploymentType } from "@/lib/hrm/employment";
import { fillOfferOnLetterhead } from "@/lib/canva/offer-letter";

const MAX_RESUME_BYTES = 8 * 1024 * 1024;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function actor() {
  return requireFeature("hrm", "edit");
}

export async function getOfferTemplateId() {
  await requireFeature("hrm", "view");
  const row = await prismadb.hrmSettings.findUnique({ where: { id: "default" } });
  return row?.offerBrandTemplateId || process.env.CANVA_OFFER_BRAND_TEMPLATE_ID?.trim() || "";
}

export async function saveOfferTemplateId(templateId: string) {
  await actor();
  const value = templateId.trim();
  await prismadb.hrmSettings.upsert({
    where: { id: "default" },
    create: { id: "default", offerBrandTemplateId: value || null },
    update: { offerBrandTemplateId: value || null },
  });
  revalidatePath("/hrm");
}

export async function listCandidates() {
  await requireFeature("hrm", "view");
  return prismadb.hrmCandidate.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getCandidate(id: string) {
  await requireFeature("hrm", "view");
  return prismadb.hrmCandidate.findUnique({ where: { id } });
}

export async function createCandidate(input: {
  fullName: string;
  email: string;
  employmentType: string;
  jobTitle?: string;
}) {
  const user = await requireFeature("hrm", "create");
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (fullName.length < 2) return { error: "Enter the candidate's name" };
  if (!isEmail(email)) return { error: "Enter a valid email" };
  if (!isEmploymentType(input.employmentType)) return { error: "Choose an employment type" };

  const row = await prismadb.hrmCandidate.create({
    data: {
      fullName,
      email,
      employmentType: input.employmentType as HrmEmploymentType,
      jobTitle: input.jobTitle?.trim() || null,
      createdBy: user.id,
    },
    select: { id: true },
  });
  revalidatePath("/hrm");
  return { id: row.id };
}

export async function updateCandidate(
  id: string,
  input: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    headline?: string;
    summary?: string;
    skills?: string;
    jobTitle?: string;
    employmentType: string;
    compensation?: string;
    startDate?: string;
  }
) {
  await actor();
  if (!isEmploymentType(input.employmentType)) return { error: "Choose an employment type" };
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) return { error: "Enter a valid email" };
  const start = input.startDate?.trim();
  await prismadb.hrmCandidate.update({
    where: { id },
    data: {
      fullName: input.fullName.trim(),
      email,
      phone: input.phone?.trim() || null,
      location: input.location?.trim() || null,
      headline: input.headline?.trim() || null,
      summary: input.summary?.trim() || null,
      skills: (input.skills ?? "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      jobTitle: input.jobTitle?.trim() || null,
      employmentType: input.employmentType as EmploymentType,
      compensation: input.compensation?.trim() || null,
      startDate: start ? new Date(start) : null,
    },
  });
  revalidatePath(`/hrm/${id}`);
  return { ok: true as const };
}

export async function setCandidateStatus(id: string, status: HrmCandidateStatus) {
  await actor();
  await prismadb.hrmCandidate.update({ where: { id }, data: { status } });
  revalidatePath(`/hrm/${id}`);
  revalidatePath("/hrm");
}

export async function uploadCandidateResume(id: string, formData: FormData) {
  const user = await actor();
  const file = formData.get("resume");
  if (!(file instanceof File)) return { error: "Choose a PDF resume" };
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return { error: "Upload a PDF resume" };
  }
  if (file.size > MAX_RESUME_BYTES) return { error: "Resume must be 8 MB or smaller" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await persistAttachmentBuffer(file.name, "application/pdf", buffer);
  const extracted = await extractResumeProfile(buffer, user.id);
  const profile = extracted.profile;

  const current = await prismadb.hrmCandidate.findUnique({ where: { id } });
  if (!current) return { error: "Candidate not found" };

  await prismadb.hrmCandidate.update({
    where: { id },
    data: {
      resumeUrl: stored.url,
      resumeFileName: file.name,
      resumeText: extracted.text.slice(0, 50000),
      fullName: profile.fullName || current.fullName,
      email: profile.email || current.email,
      phone: profile.phone || current.phone,
      location: profile.location || current.location,
      headline: profile.headline || current.headline,
      summary: profile.summary || current.summary,
      skills: profile.skills.length ? profile.skills : current.skills,
      experience: profile.experience,
      education: profile.education,
      jobTitle: profile.experience[0]?.title || current.jobTitle,
    },
  });
  revalidatePath(`/hrm/${id}`);
  return { ok: true as const, method: extracted.method };
}

export async function hireAndSendOffer(id: string) {
  const user = await actor();
  const candidate = await prismadb.hrmCandidate.findUnique({ where: { id } });
  if (!candidate) return { error: "Candidate not found" };

  const templateId = await getOfferTemplateId();
  if (!templateId) {
    return { error: "Set the Canva brand template id for the offer letterhead first" };
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "";
  if (!fromAddress) return { error: "Set EMAIL_FROM or RESEND_FROM_EMAIL so the offer can be emailed" };

  const letter = await fillOfferOnLetterhead(user.id, templateId, {
    candidateName: candidate.fullName,
    email: candidate.email,
    jobTitle: candidate.jobTitle || "Team member",
    employmentType: candidate.employmentType,
    startDate: candidate.startDate ? candidate.startDate.toISOString().slice(0, 10) : "",
    compensation: candidate.compensation || "",
    phone: candidate.phone || "",
    location: candidate.location || "",
  });

  const stored = await persistAttachmentBuffer(
    `offer-${candidate.fullName}.pdf`,
    "application/pdf",
    letter.pdf
  );
  const appName = getAppName();
  await sendMailViaResend({
    fromEmail: fromAddress,
    fromName: appName,
    to: [candidate.email],
    subject: `Your offer from ${appName}${candidate.jobTitle ? ` — ${candidate.jobTitle}` : ""}`,
    text: `Hello ${candidate.fullName},\n\nPlease find your offer letter attached.\n`,
    html: `<p>Hello ${candidate.fullName},</p><p>Please find your offer letter attached. It uses the company letterhead.</p>`,
    attachments: [{ filename: "offer-letter.pdf", content: letter.pdf, contentType: "application/pdf" }],
  });

  await prismadb.hrmCandidate.update({
    where: { id },
    data: {
      status: HrmCandidateStatus.hired,
      offerDesignId: letter.designId,
      offerEditUrl: letter.editUrl,
      offerPdfUrl: stored.url,
      offerSentAt: new Date(),
    },
  });
  revalidatePath(`/hrm/${id}`);
  revalidatePath("/hrm");
  return { ok: true as const };
}
