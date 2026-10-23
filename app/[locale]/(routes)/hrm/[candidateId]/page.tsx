import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate } from "@/actions/hrm/candidates";
import type { ResumeEducation, ResumeExperience } from "@/lib/hrm/resume-profile";
import type { CandidateStatus, EmploymentType } from "@/lib/hrm/employment";
import { CandidateEditor } from "./CandidateEditor";

export default async function CandidatePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const candidate = await getCandidate(candidateId);
  if (!candidate) notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link href="/hrm" className="text-sm text-muted-foreground hover:underline">
          Back to hiring
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{candidate.fullName}</h1>
      </div>
      <CandidateEditor
        candidate={{
          id: candidate.id,
          fullName: candidate.fullName,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          headline: candidate.headline,
          summary: candidate.summary,
          skills: candidate.skills,
          experience: (candidate.experience as ResumeExperience[]) ?? [],
          education: (candidate.education as ResumeEducation[]) ?? [],
          jobTitle: candidate.jobTitle,
          employmentType: candidate.employmentType as EmploymentType,
          compensation: candidate.compensation,
          startDate: candidate.startDate ? candidate.startDate.toISOString().slice(0, 10) : null,
          status: candidate.status as CandidateStatus,
          resumeUrl: candidate.resumeUrl,
          resumeFileName: candidate.resumeFileName,
          offerEditUrl: candidate.offerEditUrl,
          offerPdfUrl: candidate.offerPdfUrl,
          offerSentAt: candidate.offerSentAt ? candidate.offerSentAt.toISOString() : null,
        }}
      />
    </main>
  );
}
