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

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    quantity: varchar("quantity", { length: 255 }),
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
    serviceId: varchar("service_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (product) => ({
    nameIdx: index("products_name_idx").on(product.name),
    subcategoryIdx: index("products_subcategory_idx").on(product.subcategoryId),
    serviceIdx: index("products_service_idx").on(product.serviceId),
  })
);
export const productsRelations = relations(products, ({ one }) => ({
  subcategory: one(categories, {
    fields: [products.subcategoryId],
    references: [categories.id],
  }),
}));
