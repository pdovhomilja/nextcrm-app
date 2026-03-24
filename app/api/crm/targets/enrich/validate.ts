export function validateEnrichRequest(body: { targetId?: string; fields?: unknown[] }): string | null {
  if (!body.targetId || !body.fields?.length) {
    return "targetId and fields are required";
  }
  return null;
}
