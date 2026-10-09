import { ruleSummary } from "@/app/[locale]/(routes)/crm/price-lists/components/rule-summary";

const t = (key: string, p?: Record<string, unknown>) => `${key}${p ? JSON.stringify(p) : ""}`;
const r = { appliesTo: "ALL", productName: null, categoryName: null, computePrice: "FIXED", fixedPrice: 80, percentPrice: null, base: "LIST_PRICE", basePriceListName: null, priceDiscount: 0, priceSurcharge: 0, priceRound: null } as const;

it("describes target and price", () => {
  expect(ruleSummary(r, t)).toEqual({ target: "targetAll", price: 'priceFixed{"value":80}' });
  expect(ruleSummary({ ...r, appliesTo: "PRODUCT", productName: "Tea" }, t).target).toBe('targetProduct{"name":"Tea"}');
  expect(ruleSummary({ ...r, computePrice: "PERCENTAGE", percentPrice: 10 }, t).price).toBe('pricePercent{"value":10,"base":"baseLIST_PRICE"}');
  expect(ruleSummary({ ...r, computePrice: "FORMULA", base: "PRICE_LIST", basePriceListName: "Retail", priceDiscount: -5, priceRound: 1 }, t).price)
    .toBe('priceFormula{"base":"Retail","discount":-5,"round":1,"surcharge":0}');
});
