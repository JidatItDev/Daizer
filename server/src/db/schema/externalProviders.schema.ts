import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const externalProviders = pgTable("external_providers", {
  id: uuid("id").primaryKey().defaultRandom(),

  providerName: varchar("provider_name", { length: 100 }).notNull(),

  hostUrl: text("host_url").notNull(), // https://megatec-center.com/api/rest

  username: varchar("username", { length: 100 }).notNull(),

  password: text("password"), // optional (future-proof)

  token: text("token").notNull(), // u3g6HQ0yCYwevsFEf...

  currency: varchar("currency", { length: 10 }).default("USD"),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
