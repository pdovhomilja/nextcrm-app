-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable: Add enrichment fields to Documents
ALTER TABLE "Documents"
  ADD COLUMN "content_text"       TEXT,
  ADD COLUMN "summary"            TEXT,
  ADD COLUMN "content_hash"       TEXT,
  ADD COLUMN "thumbnail_url"      TEXT,
  ADD COLUMN "processing_status"  "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "processing_error"   TEXT,
  ADD COLUMN "version"            INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "parent_document_id" UUID;

-- CreateTable: crm_Embeddings_Documents
CREATE TABLE "crm_Embeddings_Documents" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id"  UUID NOT NULL,
    "embedding"    vector(1536),
    "content_hash" TEXT NOT NULL,
    "embedded_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Embeddings_Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: crm_Document_Chunks
CREATE TABLE "crm_Document_Chunks" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id"  UUID NOT NULL,
    "chunk_index"  INTEGER NOT NULL,
    "chunk_text"   TEXT NOT NULL,
    "embedding"    vector(1536),
    "embedded_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Document_Chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_Embeddings_Documents_document_id_key" ON "crm_Embeddings_Documents"("document_id");

-- CreateIndex
CREATE INDEX "crm_Document_Chunks_document_id_idx" ON "crm_Document_Chunks"("document_id");

-- CreateIndex
CREATE INDEX "Documents_content_hash_idx" ON "Documents"("content_hash");

-- CreateIndex
CREATE INDEX "Documents_parent_document_id_idx" ON "Documents"("parent_document_id");

-- CreateIndex
CREATE INDEX "Documents_processing_status_idx" ON "Documents"("processing_status");

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "Documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Embeddings_Documents" ADD CONSTRAINT "crm_Embeddings_Documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Document_Chunks" ADD CONSTRAINT "crm_Document_Chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
