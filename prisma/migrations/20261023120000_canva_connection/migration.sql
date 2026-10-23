CREATE TABLE "CanvaConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "canvaUserId" TEXT,
    "displayName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvaConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CanvaConnection_userId_key" ON "CanvaConnection"("userId");
CREATE INDEX "CanvaConnection_userId_idx" ON "CanvaConnection"("userId");

ALTER TABLE "CanvaConnection" ADD CONSTRAINT "CanvaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
