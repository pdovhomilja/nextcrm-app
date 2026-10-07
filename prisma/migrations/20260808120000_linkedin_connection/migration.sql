-- CreateTable
CREATE TABLE "LinkedInConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInConnection_userId_key" ON "LinkedInConnection"("userId");

-- CreateIndex
CREATE INDEX "LinkedInConnection_userId_idx" ON "LinkedInConnection"("userId");

-- AddForeignKey
ALTER TABLE "LinkedInConnection" ADD CONSTRAINT "LinkedInConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
