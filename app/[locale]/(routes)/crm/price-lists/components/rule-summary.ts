type T = (key: string, params?: Record<string, string | number>) => string;
export interface RuleView {
  appliesTo: "ALL" | "CATEGORY" | "PRODUCT"; productName: string | null; categoryName: string | null;
  computePrice: "FIXED" | "PERCENTAGE" | "FORMULA"; fixedPrice: number | null; percentPrice: number | null;
  base: "LIST_PRICE" | "COST" | "PRICE_LIST"; basePriceListName: string | null; priceDiscount: number; priceSurcharge: number; priceRound: number | null;
}

export function ruleSummary(r: RuleView, t: T): { target: string; price: string } {
  const target = r.appliesTo === "PRODUCT" ? t("targetProduct", { name: r.productName ?? "?" })
    : r.appliesTo === "CATEGORY" ? t("targetCategory", { name: r.categoryName ?? "?" }) : t("targetAll");
  const base = r.base === "PRICE_LIST" ? r.basePriceListName ?? "?" : t(`base${r.base}`);
  const price = r.computePrice === "FIXED" ? t("priceFixed", { value: r.fixedPrice ?? 0 })
    : r.computePrice === "PERCENTAGE" ? t("pricePercent", { value: r.percentPrice ?? 0, base })
    : t("priceFormula", { base, discount: r.priceDiscount, round: r.priceRound ?? 0, surcharge: r.priceSurcharge });
  return { target, price };
}
