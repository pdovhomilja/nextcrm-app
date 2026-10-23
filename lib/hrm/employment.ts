export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "permanent",
  "contract",
  "internship",
  "temporary",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  permanent: "Permanent",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

export const CANDIDATE_STATUSES = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export function isEmploymentType(value: string): value is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(value);
}
