// import { z } from "zod";

// export const updateOrCreateConfigSchema = z.object({
//   minimumBalanceRequirement: z
//     .union([z.string(), z.number()])
//     .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
//     .refine((val) => val >= 0, "Must be a positive number")
//     .optional(),

//   emailTemplate: z.string().optional(),
//   // logoUrl handled via file upload
// });

// export type UpdateOrCreateConfigInput = z.infer<
//   typeof updateOrCreateConfigSchema
// >;
import { z } from "zod";

export const updateOrCreateConfigSchema = z.object({
  minimumBalanceRequirement: z.string().optional(),

  emailTemplate: z.string().optional(),

  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalMode: z.enum(["sandbox", "live"]).optional(),
});
