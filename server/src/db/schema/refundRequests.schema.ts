import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const refundRequests = pgTable(
  "refund_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id"),
    userId: uuid("user_id").notNull(),
    amount: integer("amount").notNull(),
    reason: varchar("reason", { length: 255 }),
    status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
    adminId: uuid("admin_id"), // who approved/rejected
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (rr) => ({
    userIdx: index("refund_user_idx").on(rr.userId),
  })
);
