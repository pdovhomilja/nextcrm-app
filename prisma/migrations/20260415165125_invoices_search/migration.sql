CREATE INDEX IF NOT EXISTS invoices_search_vector_idx
  ON "Invoices" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION invoices_search_vector_update() RETURNS trigger AS $$
DECLARE
  line_text text;
BEGIN
  SELECT string_agg(description, ' ') INTO line_text
    FROM "Invoice_LineItems" WHERE "invoiceId" = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.number, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."billingSnapshot"->>'name', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."billingSnapshot"->>'vat_id', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(line_text, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_search_vector_trg ON "Invoices";
CREATE TRIGGER invoices_search_vector_trg
  BEFORE INSERT OR UPDATE ON "Invoices"
  FOR EACH ROW EXECUTE FUNCTION invoices_search_vector_update();
