import { z } from "zod";

export const createEmailTemplateSchema = z.object({
  body: z.string().min(1, "Body is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  subject: z.string().min(1, "Subject is required"),
});

export const updateEmailTemplateSchema = z.object({
  body: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  subject: z.string().optional(),
});
