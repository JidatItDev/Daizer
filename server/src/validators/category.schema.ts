import { z } from "zod";

// Common
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid category id"),
  }),
});

export const pagedQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  }),
});

// Create parent category
export const createParentCategorySchema = z.object({
  name: z.string().min(2).max(255),
});

// Create subcategory
export const createSubcategorySchema = z.object({
  name: z.string().min(2).max(255),
  parentCategoryId: z.string().uuid("Invalid parentCategoryId"),
});

// Update category (name and/or move under different parent)
export const updateCategoryMultipartSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    parentCategoryId: z
      .string()
      .uuid("Invalid parentCategoryId")
      .nullable()
      .optional(),
    id: z.string().uuid("Invalid category id"), // Include ID directly in the schema
  })
  .refine(
    (data) => data.name !== undefined || data.parentCategoryId !== undefined,
    { message: "Provide at least one field to update" }
  );

// Option 2: Keep the original structure but transform the data
export const updateCategorySchema = z.object({
  name: z.string().min(2).max(255).optional(),
});

// Helper function to transform multipart data to match schema structure
export const transformMultipartToSchema = (multipartData: any, params: any) => {
  return {
    params,
    body: multipartData,
  };
};

// Only subcategories of a given category
export const getSubcategoriesOfCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid parent category id"),
  }),
  ...pagedQuerySchema.shape,
});

// Simple list fetchers
export const listParentsSchema = pagedQuerySchema;
export const listSubcategoriesSchema = pagedQuerySchema;

// Tree (all categories + nested subs)
export const listCategoriesTreeSchema = z.object({});
