import { z } from "zod";

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
  // Handle pricingGroupPrices as either object or JSON string
  pricingGroupPrices: z
    .union([
      z.record(z.string(), z.number().positive()), // Direct object
      parseJsonString.pipe(z.record(z.string(), z.number().positive())), // JSON string
    ])
    .optional(),
  subcategoryId: z.string().uuid(),
});

// Alternative simpler approach - let the middleware handle JSON parsing
export const createProductSchemaSimple = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  pricingGroupPrices: z.record(z.string(), z.number().positive()).optional(),
  subcategoryId: z.string().uuid(),
});

// Update Product Schema
export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  pricingGroupPrices: z
    .union([
      z.record(z.string(), z.number().positive()),
      parseJsonString.pipe(z.record(z.string(), z.number().positive())),
    ])
    .optional(),
  subcategoryId: z.string().uuid().optional(),
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
