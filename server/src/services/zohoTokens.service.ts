import { eq } from "drizzle-orm";
import { db } from "../db/dbConnection";
import { zohoTokens } from "../db/schema";

export class ZohoTokensService {
  async saveTokens(tokens: any) {
    const existing = await db.select().from(zohoTokens).limit(1);
    if (existing.length > 0) {
      await db
        .update(zohoTokens)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || existing[0].refreshToken,
          expiresAt: tokens.expiresAt, // ✅ Store Date
          createdAt: new Date(),
        })
        .where(eq(zohoTokens.id, existing[0].id));
    } else {
      await db.insert(zohoTokens).values({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt, // ✅ Matches key above
      });
    }

    console.log("✅ Tokens saved in DB");
  }

  async getTokens() {
    const rows = await db.select().from(zohoTokens).limit(1);
    if (!rows.length) throw new Error("❌ No Zoho tokens found in DB");
    return rows[0];
  }
}
