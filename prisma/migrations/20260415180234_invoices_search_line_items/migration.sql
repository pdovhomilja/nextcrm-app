CREATE OR REPLACE FUNCTION invoices_search_vector_from_line_item() RETURNS trigger AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW."invoiceId", OLD."invoiceId");
  UPDATE "Invoices" SET "updatedAt" = "updatedAt" WHERE id = target_id;
  RETURN NULL;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_search_vector_line_items_trg ON "Invoice_LineItems";
CREATE TRIGGER invoices_search_vector_line_items_trg
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice_LineItems"
  FOR EACH ROW EXECUTE FUNCTION invoices_search_vector_from_line_item();
