// src/db/schema/relations.ts
import { relations } from "drizzle-orm";
import { users } from "./User.schema";
import { pricingGroups } from "./pricingGroup.schema";
import { signupLinks } from "./signupLinks.schema";
import { products } from "./products.schema";
import { categories } from "./categories.schema";
import { wallets } from "./wallets.schema";
import { transactions } from "./transactions.schema";
import { refundRequests } from "./refundRequests.schema";

// ----------------------
// Users Relations
// ----------------------
export const usersRelations = relations(users, ({ one, many }) => ({
  pricingGroup: one(pricingGroups, {
    fields: [users.pricingGroupId],
    references: [pricingGroups.id],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  transactions: many(transactions),
  refundRequests: many(refundRequests),
}));

// ----------------------
// Wallets Relations
// ----------------------
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

// ----------------------
// Transactions Relations
// ----------------------
export const transactionsRelations = relations(
  transactions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    wallet: one(wallets, {
      fields: [transactions.walletId],
      references: [wallets.id],
    }),
    refundRequests: many(refundRequests),
  })
);

// ----------------------
// Refund Requests Relations
// ----------------------
export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  user: one(users, {
    fields: [refundRequests.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [refundRequests.transactionId],
    references: [transactions.id],
  }),
  admin: one(users, {
    fields: [refundRequests.adminId],
    references: [users.id],
  }),
}));

// ----------------------
// Pricing Groups Relations
// ----------------------
export const pricingGroupsRelations = relations(pricingGroups, ({ many }) => ({
  users: many(users),
  signupLinks: many(signupLinks),
}));

// ----------------------
// Signup Links Relations
// ----------------------
export const signupLinksRelations = relations(signupLinks, ({ one }) => ({
  pricingGroup: one(pricingGroups, {
    fields: [signupLinks.pricingGroupId],
    references: [pricingGroups.id],
  }),
}));

// ----------------------
// Categories Relations
// ----------------------
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

// ----------------------
// Products Relations
// ----------------------
export const productsRelations = relations(products, ({ one }) => ({
  subcategory: one(categories, {
    fields: [products.subcategoryId],
    references: [categories.id],
  }),
}));
