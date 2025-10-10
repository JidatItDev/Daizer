import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const config = pgTable("config", {
  id: uuid("id").primaryKey().defaultRandom(),
  logoUrl: text("logo_url"),
  minimumBalanceRequirement: numeric("minimum_balance_requirement", {
    precision: 12,
    scale: 2,
  }).default("0.00"),
  emailTemplate: text("email_template"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
