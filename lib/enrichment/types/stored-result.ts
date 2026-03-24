import type { EnrichmentResult } from "./index";

/**
 * Shape stored in crm_Contact_Enrichment.result JSON field.
 * Also the shape returned by the SSE 'result' event for the diff preview.
 */
export interface StoredEnrichmentResult {
  enrichments: Record<string, EnrichmentResult>;
  status: "completed" | "error" | "skipped";
  error?: string;
}
