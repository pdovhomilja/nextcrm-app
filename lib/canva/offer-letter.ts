import { canvaFetch } from "@/lib/canva/client";
import { exportDesign } from "@/lib/canva/designs";
import { EMPLOYMENT_LABELS, type EmploymentType } from "@/lib/hrm/employment";

export type OfferLetterFields = {
  candidateName: string;
  email: string;
  jobTitle: string;
  employmentType: EmploymentType;
  startDate: string;
  compensation: string;
  phone: string;
  location: string;
};

type AutofillJob = {
  id: string;
  status: string;
  error?: { message?: string };
  result?: { design?: { id?: string; urls?: { edit_url?: string } } };
};

function textField(value: string) {
  return { type: "text" as const, text: value || "—" };
}

export async function fillOfferOnLetterhead(userId: string, brandTemplateId: string, fields: OfferLetterFields) {
  const started = (await canvaFetch(userId, "/autofills", {
    method: "POST",
    body: JSON.stringify({
      brand_template_id: brandTemplateId,
      title: `Offer — ${fields.candidateName}`.slice(0, 255),
      data: {
        candidate_name: textField(fields.candidateName),
        email: textField(fields.email),
        job_title: textField(fields.jobTitle),
        employment_type: textField(EMPLOYMENT_LABELS[fields.employmentType]),
        start_date: textField(fields.startDate),
        compensation: textField(fields.compensation),
        phone: textField(fields.phone),
        location: textField(fields.location),
      },
    }),
  })) as { job: AutofillJob };

  const job = await waitForAutofill(userId, started.job);
  const designId = job.result?.design?.id;
  if (!designId) throw new Error("Canva finished the letter but did not return a design id");
  const urls = await exportDesign(userId, designId, "pdf");
  const pdfUrl = urls[0];
  if (!pdfUrl) throw new Error("Canva did not return an offer PDF");
  const pdf = await fetch(pdfUrl);
  if (!pdf.ok) throw new Error("Could not download the offer PDF from Canva");
  return {
    designId,
    editUrl: job.result?.design?.urls?.edit_url ?? `https://www.canva.com/design/${designId}/edit`,
    pdf: Buffer.from(await pdf.arrayBuffer()),
  };
}

async function waitForAutofill(userId: string, job: AutofillJob): Promise<AutofillJob> {
  let current = job;
  for (let i = 0; i < 20; i++) {
    if (current.status === "success") return current;
    if (current.status === "failed") {
      throw new Error(current.error?.message || "Canva could not fill the offer letter template");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const next = (await canvaFetch(userId, `/autofills/${encodeURIComponent(current.id)}`)) as {
      job: AutofillJob;
    };
    current = next.job;
  }
  throw new Error("Canva is still generating the offer letter. Try again in a moment.");
}
