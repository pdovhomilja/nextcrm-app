import type { Decimal } from "decimal.js";

export type Target = "ALL" | "CATEGORY" | "PRODUCT";
export type Compute = "FIXED" | "PERCENTAGE" | "FORMULA";
export type Base = "LIST_PRICE" | "COST" | "PRICE_LIST";

export interface RuleData {
  id: string;
  appliesTo: Target;
  categoryId: string | null;
  productId: string | null;
  minQuantity: Decimal;
  dateStart: Date | null;
  dateEnd: Date | null;
  computePrice: Compute;
  fixedPrice: Decimal | null;
  percentPrice: Decimal | null;
  base: Base;
  basePriceListId: string | null;
  priceDiscount: Decimal;
  priceSurcharge: Decimal;
  priceRound: Decimal | null;
  priceMinMargin: Decimal | null;
  priceMaxMargin: Decimal | null;
  createdAt: Date;
}

export interface ListData { id: string; currency: string; rules: RuleData[] }

export interface ProductData { id: string; unitPrice: Decimal; unitCost: Decimal | null; currency: string; categoryId: string | null }

/** categoryChain: the product's category first, then its ancestors. rate() throws MissingRateError. */
export interface PricingContext {
  lists: Map<string, ListData>;
  product: ProductData;
  categoryChain: string[];
  rate(from: string, to: string): Decimal;
}

export type StepLabel = "fallback" | "fixed" | "base" | "percentage" | "discount" | "round" | "surcharge" | "minMargin" | "maxMargin";
export interface PriceStep { label: StepLabel; value: Decimal }
export interface PriceResult { price: Decimal; currency: string; listPrice: Decimal; ruleId: string | null; steps: PriceStep[] }
