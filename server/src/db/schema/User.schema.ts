import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).default("user"),
    isActive: boolean("is_active").default(false),
    pricingGroupId: uuid("pricing_group_id"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    zohoWalletSubAccountId: text("zoho_wallet_sub_account_id")
      .notNull()
      .default(""),
    zohoContactId: text("zoho_contact_id").notNull(),
    zohoContactStatus: text("zoho_contact_status").notNull(),
    zohoCreatedAt: timestamp("zoho_created_at", {
      withTimezone: true,
    }).notNull(),
    zohoCompanyName: text("zoho_company_name").notNull(),
  },
  (user) => ({
    emailIdx: index("users_email_idx").on(user.email),
  })
);
