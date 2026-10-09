import { Prisma, crm_PriceList_Source, crm_PriceRule_Base, crm_PriceRule_Compute, crm_PriceRule_Target } from "@prisma/client";

it("generates the pricing enums", () => {
  expect(Object.values(crm_PriceList_Source)).toEqual(["CRM", "EXTERNAL"]);
  expect(Object.values(crm_PriceRule_Target)).toEqual(["ALL", "CATEGORY", "PRODUCT"]);
  expect(Object.values(crm_PriceRule_Compute)).toEqual(["FIXED", "PERCENTAGE", "FORMULA"]);
  expect(Object.values(crm_PriceRule_Base)).toEqual(["LIST_PRICE", "COST", "PRICE_LIST"]);
});

it("generates the pricing columns", () => {
  expect(Prisma.Crm_PriceListsScalarFieldEnum.externalRef).toBe("externalRef");
  expect(Prisma.Crm_PriceListRulesScalarFieldEnum.priceRound).toBe("priceRound");
  expect(Prisma.Crm_PriceListRulesScalarFieldEnum.basePriceListId).toBe("basePriceListId");
  expect(Prisma.Crm_AccountsScalarFieldEnum.pricelist_id).toBe("pricelist_id");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.parentId).toBe("parentId");
});
