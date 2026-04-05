import { z } from "zod";

const decimalLike = z
  .union([z.number(), z.bigint()])
  .transform((v) => Number(v));

export const productsSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  unit_price: decimalLike,
  unit_cost: decimalLike.nullable(),
  currency: z.string(),
  tax_rate: decimalLike.nullable(),
  unit: z.string().nullable(),
  is_recurring: z.boolean(),
  billing_period: z.string().nullable(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  created_by_user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
    })
    .nullable(),
  _count: z.object({
    accountProducts: z.number(),
  }),
  createdAt: z.date(),
});

export type Product = z.infer<typeof productsSchema>;
