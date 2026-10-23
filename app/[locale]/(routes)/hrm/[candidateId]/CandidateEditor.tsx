"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hireAndSendOffer, setCandidateStatus, updateCandidate, uploadCandidateResume } from "@/actions/hrm/candidates";
import {
  CANDIDATE_STATUSES,
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  STATUS_LABELS,
  type CandidateStatus,
  type EmploymentType,
} from "@/lib/hrm/employment";
import type { ResumeEducation, ResumeExperience } from "@/lib/hrm/resume-profile";

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  jobTitle: string | null;
  employmentType: EmploymentType;
  compensation: string | null;
  startDate: string | null;
  status: CandidateStatus;
  resumeUrl: string | null;
  resumeFileName: string | null;
  offerEditUrl: string | null;
  offerPdfUrl: string | null;
  offerSentAt: string | null;
};

export function CandidateEditor({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <form
        className="space-y-3 rounded-xl border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy("resume");
          setError(null);
          try {
            const result = await uploadCandidateResume(candidate.id, data);
            if ("error" in result) setError(result.error);
            else router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not read the resume");
          } finally {
            setBusy(null);
          }
        }}
      >
        <h2 className="text-sm font-semibold">Resume</h2>
        <p className="text-sm text-muted-foreground">
          PDF text is read from the file, then structured into the profile. A scan that is only a picture of paper
          will not extract.
        </p>
        <Input name="resume" type="file" accept="application/pdf,.pdf" required />
        {candidate.resumeFileName && (
          <p className="text-xs text-muted-foreground">
            Current file: {candidate.resumeFileName}
            {candidate.resumeUrl ? (
              <>
                {" "}
                · <a className="underline" href={candidate.resumeUrl}>Open</a>
              </>
            ) : null}
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={busy !== null}>
          {busy === "resume" ? "Reading resume…" : "Upload and extract"}
        </Button>
      </form>

      <form
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy("save");
          setError(null);
          try {
            const result = await updateCandidate(candidate.id, {
              fullName: String(data.get("fullName") ?? ""),
              email: String(data.get("email") ?? ""),
              phone: String(data.get("phone") ?? ""),
              location: String(data.get("location") ?? ""),
              headline: String(data.get("headline") ?? ""),
              summary: String(data.get("summary") ?? ""),
              skills: String(data.get("skills") ?? ""),
              jobTitle: String(data.get("jobTitle") ?? ""),
              employmentType: String(data.get("employmentType") ?? ""),
              compensation: String(data.get("compensation") ?? ""),
              startDate: String(data.get("startDate") ?? ""),
            });
            if (result && "error" in result) setError(result.error);
            else router.refresh();
          } finally {
            setBusy(null);
          }
        }}
      >
        <h2 className="text-sm font-semibold sm:col-span-2">Profile</h2>
        <Field label="Name" name="fullName" defaultValue={candidate.fullName} />
        <Field label="Email" name="email" defaultValue={candidate.email} />
        <Field label="Phone" name="phone" defaultValue={candidate.phone ?? ""} />
        <Field label="Location" name="location" defaultValue={candidate.location ?? ""} />
        <Field label="Headline" name="headline" defaultValue={candidate.headline ?? ""} />
        <Field label="Role" name="jobTitle" defaultValue={candidate.jobTitle ?? ""} />
        <div className="space-y-1">
          <Label htmlFor="employmentType">Employment type</Label>
          <select
            id="employmentType"
            name="employmentType"
            defaultValue={candidate.employmentType}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYMENT_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <Field label="Compensation" name="compensation" defaultValue={candidate.compensation ?? ""} />
        <Field label="Start date" name="startDate" type="date" defaultValue={candidate.startDate ?? ""} />
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="skills">Skills</Label>
          <Input id="skills" name="skills" defaultValue={candidate.skills.join(", ")} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" name="summary" rows={4} defaultValue={candidate.summary ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy !== null}>
            {busy === "save" ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      {(candidate.experience.length > 0 || candidate.education.length > 0) && (
        <section className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">Experience</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {candidate.experience.map((item, index) => (
                <li key={`${item.company}-${index}`}>
                  <span className="font-medium">{item.title || "Role"}</span>
                  {item.company ? ` · ${item.company}` : ""}
                  {item.dates ? <span className="block text-muted-foreground">{item.dates}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Education</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {candidate.education.map((item, index) => (
                <li key={`${item.school}-${index}`}>
                  <span className="font-medium">{item.degree || "Study"}</span>
                  {item.school ? ` · ${item.school}` : ""}
                  {item.dates ? <span className="block text-muted-foreground">{item.dates}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Lifecycle</h2>
        <p className="text-sm text-muted-foreground">Current stage: {STATUS_LABELS[candidate.status]}</p>
        <div className="flex flex-wrap gap-2">
          {CANDIDATE_STATUSES.filter((status) => status !== "hired").map((status) => (
            <Button
              key={status}
              type="button"
              variant={candidate.status === status ? "default" : "outline"}
              disabled={busy !== null}
              onClick={async () => {
                setBusy(status);
                setError(null);
                try {
                  await setCandidateStatus(candidate.id, status);
                  router.refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
          <Button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("hire");
              setError(null);
              try {
                const result = await hireAndSendOffer(candidate.id);
                if ("error" in result && result.error) setError(result.error);
                else router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not send the offer");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "hire" ? "Sending offer…" : "Hire and send offer letter"}
          </Button>
        </div>
        {candidate.offerSentAt && (
          <p className="text-sm text-muted-foreground">
            Offer emailed {new Date(candidate.offerSentAt).toLocaleString()}.
            {candidate.offerPdfUrl ? (
              <>
                {" "}
                <a className="underline" href={candidate.offerPdfUrl}>PDF</a>
              </>
            ) : null}
            {candidate.offerEditUrl ? (
              <>
                {" "}
                · <a className="underline" href={candidate.offerEditUrl} target="_blank" rel="noreferrer">Edit in Canva</a>
              </>
            ) : null}
          </p>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
