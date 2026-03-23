-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENAI', 'FIRECRAWL', 'ANTHROPIC', 'GROQ');

-- CreateTable
CREATE TABLE "ApiKeys" (
    "id" UUID NOT NULL,
    "scope" "ApiKeyScope" NOT NULL,
    "userId" UUID,
    "provider" "ApiKeyProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKeys_scope_provider_idx" ON "ApiKeys"("scope", "provider");

-- CreateIndex
CREATE INDEX "ApiKeys_userId_provider_idx" ON "ApiKeys"("userId", "provider");

-- AddForeignKey
ALTER TABLE "ApiKeys" ADD CONSTRAINT "ApiKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "openAi_keys" DROP CONSTRAINT IF EXISTS "openAi_keys_user_fkey";

-- DropTable
DROP TABLE "openAi_keys";

-- Partial unique indexes (@@unique doesn't handle NULL correctly for SYSTEM scope)
CREATE UNIQUE INDEX "api_keys_system_provider_unique"
  ON "ApiKeys" (provider)
  WHERE scope = 'SYSTEM';

CREATE UNIQUE INDEX "api_keys_user_provider_unique"
  ON "ApiKeys" ("userId", provider)
  WHERE scope = 'USER';
