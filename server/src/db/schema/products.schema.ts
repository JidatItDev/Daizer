import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { categories } from "./categories.schema";
import { relations } from "drizzle-orm";

// -------------------------
// Products
// -------------------------
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    // JSONB for flexible pricing groups
    pricingGroupPrices: jsonb("pricing_group_prices").$type<
      { id: string; name: string; price: number }[]
    >(),
    // JSONB for image object
    image: jsonb("image").$type<{ name: string; url: string }>(),
    // Each product belongs to a subcategory
    subcategoryId: uuid("subcategory_id").references(() => categories.id, {
      onDelete: "set null", // product still exists even if category deleted
    }),
    subcategoryName: varchar("subcategory_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (product) => ({
    nameIdx: index("products_name_idx").on(product.name),
    subcategoryIdx: index("products_subcategory_idx").on(product.subcategoryId),
  })
);
export const productsRelations = relations(products, ({ one }) => ({
  subcategory: one(categories, {
    fields: [products.subcategoryId],
    references: [categories.id],
  }),
}));
