// drizzle/schema/zohoTokens.ts
import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const zohoTokens = pgTable("zoho_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresIn: integer("expires_in"),
  createdAt: timestamp("created_at").defaultNow(),
});
