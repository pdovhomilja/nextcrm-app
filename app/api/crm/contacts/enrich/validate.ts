export function validateEnrichRequest(body: { contactId?: string; fields?: unknown[] }): string | null {
  if (!body.contactId || !body.fields?.length) {
    return "contactId and fields are required";
  }
  return null;
}
