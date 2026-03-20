-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Accounts embeddings
CREATE TABLE "crm_Embeddings_Accounts" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id"   UUID NOT NULL UNIQUE REFERENCES "crm_Accounts"("id") ON DELETE CASCADE,
  "embedding"    vector(1536) NOT NULL,
  "content_hash" TEXT NOT NULL,
  "embedded_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "crm_Embeddings_Accounts" USING hnsw ("embedding" vector_cosine_ops);

-- Contacts embeddings
CREATE TABLE "crm_Embeddings_Contacts" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id"   UUID NOT NULL UNIQUE REFERENCES "crm_Contacts"("id") ON DELETE CASCADE,
  "embedding"    vector(1536) NOT NULL,
  "content_hash" TEXT NOT NULL,
  "embedded_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "crm_Embeddings_Contacts" USING hnsw ("embedding" vector_cosine_ops);

-- Leads embeddings
CREATE TABLE "crm_Embeddings_Leads" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id"      UUID NOT NULL UNIQUE REFERENCES "crm_Leads"("id") ON DELETE CASCADE,
  "embedding"    vector(1536) NOT NULL,
  "content_hash" TEXT NOT NULL,
  "embedded_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "crm_Embeddings_Leads" USING hnsw ("embedding" vector_cosine_ops);

-- Opportunities embeddings
CREATE TABLE "crm_Embeddings_Opportunities" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "opportunity_id"  UUID NOT NULL UNIQUE REFERENCES "crm_Opportunities"("id") ON DELETE CASCADE,
  "embedding"       vector(1536) NOT NULL,
  "content_hash"    TEXT NOT NULL,
  "embedded_at"     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "crm_Embeddings_Opportunities" USING hnsw ("embedding" vector_cosine_ops);
