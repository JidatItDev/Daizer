import { z } from "zod";

export const createPricingGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(255, "Name cannot exceed 255 characters"),
  isDefault: z.boolean().optional(),
});

export const updatePricingGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(255, "Name cannot exceed 255 characters")
    .optional(),
  isDefault: z.boolean().optional(),
});

export const deletePricingGroupSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid PricingGroup ID format"),
  }),
});

export const getPricingGroupByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid PricingGroup ID format"),
  }),
});
