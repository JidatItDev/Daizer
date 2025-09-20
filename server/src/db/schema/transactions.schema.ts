import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  numeric,
} from "drizzle-orm/pg-core";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id").notNull(),
    userId: uuid("user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // topup, purchase, refund, adjustment
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    referenceId: varchar("reference_id", { length: 255 }),
    metadata: varchar("metadata", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (trx) => ({
    userIdx: index("transactions_user_idx").on(trx.userId),
    walletIdx: index("transactions_wallet_idx").on(trx.walletId),
  })
);
