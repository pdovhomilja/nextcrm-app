-- Add better-auth required fields to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
