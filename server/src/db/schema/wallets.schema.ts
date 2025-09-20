import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  index,
  numeric,
} from "drizzle-orm/pg-core";

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (wallet) => ({
    userIdx: index("wallets_user_idx").on(wallet.userId),
  })
);
