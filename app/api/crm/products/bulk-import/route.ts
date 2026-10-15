import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { parseDocumentFile, normalizeHeader } from "@/lib/import/document-ocr";

export const runtime = "nodejs";

export interface ExtractedProduct {
  name: string;
  sku?: string;
  type?: string;
  category?: string;
  description?: string;
  unit_price?: string;
  unit_cost?: string;
  currency?: string;
  tax_rate?: string;
  unit?: string;
}

function mapRowToProduct(row: Record<string, string>): ExtractedProduct {
  const normMap = new Map(
    Object.entries(row).map(([k, v]) => [normalizeHeader(k), String(v ?? "").trim()])
  );

  const name =
    normMap.get("name") ||
    normMap.get("productname") ||
    normMap.get("title") ||
    normMap.get("item") ||
    normMap.get("rawtext") ||
    "Product Item";

  const sku =
    normMap.get("sku") ||
    normMap.get("productcode") ||
    normMap.get("code") ||
    "";

  const type =
    normMap.get("type") ||
    normMap.get("producttype") ||
    "PRODUCT";

  const category =
    normMap.get("category") ||
    normMap.get("productcategory") ||
    "";

  const description =
    normMap.get("description") ||
    normMap.get("details") ||
    normMap.get("notes") ||
    "";

  const unit_price =
    normMap.get("unitprice") ||
    normMap.get("price") ||
    normMap.get("cost") ||
    "0";

  const unit_cost =
    normMap.get("unitcost") ||
    normMap.get("basecost") ||
    "";

  const currency =
    normMap.get("currency") ||
    "USD";

  const tax_rate =
    normMap.get("taxrate") ||
    normMap.get("tax") ||
    "";

  const unit =
    normMap.get("unit") ||
    normMap.get("unitofmeasure") ||
    "per unit";

  return {
    name,
    sku,
    type,
    category,
    description,
    unit_price,
    unit_cost,
    currency,
    tax_rate,
    unit,
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // 1. Save Products Bulk Import Action
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { products } = body;

      if (!Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: "No products provided to import" }, { status: 400 });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const item of products) {
        if (!item.name) continue;

        try {
          const uPrice = parseFloat(item.unit_price || "0");
          const uCost = item.unit_cost ? parseFloat(item.unit_cost) : undefined;
          const tRate = item.tax_rate ? parseFloat(item.tax_rate) : undefined;
          const pType = (item.type || "PRODUCT").toUpperCase().includes("SERVICE") ? "SERVICE" : "PRODUCT";

          await prismadb.crm_Products.create({
            data: {
              name: item.name,
              sku: item.sku || undefined,
              type: pType as any,
              description: item.description || undefined,
              status: "ACTIVE",
              unit_price: isNaN(uPrice) ? 0 : uPrice,
              unit_cost: uCost && !isNaN(uCost) ? uCost : undefined,
              currency: item.currency || "USD",
              tax_rate: tRate && !isNaN(tRate) ? tRate : undefined,
              unit: item.unit || "per unit",
              createdBy: session.user.id,
              updatedBy: session.user.id,
            },
          });
          importedCount++;
        } catch (err: any) {
          errors.push(`Failed product "${item.name}": ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        importedCount,
        skippedCount: products.length - importedCount,
        errors,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to process products bulk import" }, { status: 500 });
    }
  }

  // 2. Parse Document / Spreadsheet / PDF OCR File
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const { rows, method } = await parseDocumentFile(file);
    const extractedProducts: ExtractedProduct[] = rows.map((r) => mapRowToProduct(r));

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractionMethod: method,
      totalDetected: extractedProducts.length,
      products: extractedProducts,
    });
  } catch (err: any) {
    console.error("[PRODUCTS_BULK_IMPORT_PARSE_ERROR]", err);
    return NextResponse.json({ error: err.message || "Failed to parse product file" }, { status: 500 });
  }
}
