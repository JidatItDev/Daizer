// drizzle/schema/zohoTokens.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const zohoTokens = pgTable("zoho_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(), // ✅ Changed
  createdAt: timestamp("created_at").defaultNow(),
});
