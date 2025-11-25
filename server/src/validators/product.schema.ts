import { z } from "zod";

const booleanFromString = z
  .union([z.string(), z.boolean()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    if (val === "true") return true;
    if (val === "false") return false;
    return false; // or throw
  });
// Create Product
const parseJsonString = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid JSON string",
    });
    return z.NEVER;
  }
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== undefined ? val.toString() : undefined)),

  isActive: booleanFromString.optional(),
  pricingGroupPrices: z
    .union([
      z.record(z.string(), z.number().positive()), // Direct object
      parseJsonString.pipe(z.record(z.string(), z.number().positive())), // JSON string
    ])
    .optional(),
  subcategoryId: z.string().uuid(),
  serviceId: z
    .union([z.string(), z.number()])
    .transform((val) => val.toString()),
});

// Alternative simpler approach - let the middleware handle JSON parsing
export const createProductSchemaSimple = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  isActive: booleanFromString.optional(),
  pricingGroupPrices: z.record(z.string(), z.number().positive()).optional(),
  subcategoryId: z.string().uuid(),
  serviceId: z
    .union([z.string(), z.number()])
    .transform((val) => val.toString()),
});

// Update Product Schema
export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  quantity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val !== undefined ? val.toString() : undefined)),

  description: z.string().optional(),
  isActive: booleanFromString.optional(),
  pricingGroupPrices: z
    .union([
      z.record(z.string(), z.number().positive()),
      parseJsonString.pipe(z.record(z.string(), z.number().positive())),
    ])
    .optional(),
  subcategoryId: z.string().uuid().optional(),
  serviceId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => val && val.toString()),
});

// Delete Product
export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

// Get all products
export const getAllProductsSchema = z.object({});
export const getProductSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: "Invalid product ID" }), // Assuming UUID primary key
  }),
});
export const getProductByCategorySchema = z.object({});
