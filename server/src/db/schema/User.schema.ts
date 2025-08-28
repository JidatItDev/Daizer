import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { pricingGroups } from "./pricingGroup.schema"; // assuming you have this schema

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).default("user"),
    isActive: boolean("is_active").default(false),
    pricingGroupId: uuid("pricing_group_id").references(
      () => pricingGroups.id,
      {
        onDelete: "set null",
      }
    ),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (user) => ({
    emailIdx: index("users_email_idx").on(user.email),
  })
);
