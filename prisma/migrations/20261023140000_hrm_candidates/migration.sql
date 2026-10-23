CREATE TYPE "HrmEmploymentType" AS ENUM ('full_time', 'part_time', 'permanent', 'contract', 'internship', 'temporary');
CREATE TYPE "HrmCandidateStatus" AS ENUM ('new', 'screening', 'interview', 'offer', 'hired', 'rejected');

CREATE TABLE "HrmSettings" (
    "id" TEXT NOT NULL,
    "offerBrandTemplateId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrmSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrmCandidate" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "headline" TEXT,
    "summary" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "jobTitle" TEXT,
    "employmentType" "HrmEmploymentType" NOT NULL,
    "compensation" TEXT,
    "startDate" TIMESTAMP(3),
    "status" "HrmCandidateStatus" NOT NULL DEFAULT 'new',
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeText" TEXT,
    "offerDesignId" TEXT,
    "offerEditUrl" TEXT,
    "offerPdfUrl" TEXT,
    "offerSentAt" TIMESTAMP(3),
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrmCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HrmCandidate_status_idx" ON "HrmCandidate"("status");
CREATE INDEX "HrmCandidate_email_idx" ON "HrmCandidate"("email");
CREATE INDEX "HrmCandidate_createdBy_idx" ON "HrmCandidate"("createdBy");

ALTER TABLE "HrmCandidate" ADD CONSTRAINT "HrmCandidate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
