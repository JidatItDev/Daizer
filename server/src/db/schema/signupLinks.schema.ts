import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { pricingGroups } from "./pricingGroup.schema";

export const signupLinks = pgTable("signup_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  pricingGroupId: uuid("pricing_group_id").references(() => pricingGroups.id, {
    onDelete: "set null",
  }),
  isUsed: boolean("is_used").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
