import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { externalProviders } from "./externalProviders.schema";

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
    isActive: boolean("is_active").default(true).notNull(),
    subcategoryId: uuid("subcategory_id"),
    subcategoryName: varchar("subcategory_name", { length: 255 }),
    serviceId: varchar("service_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    zohoItemId: varchar("zoho_item_id", { length: 50 }).default(""),
    apiProviderId: uuid("api_provider_id")
      .notNull()
      .references(() => externalProviders.id),
    apiProviderName: varchar("api_provider_name", { length: 100 }),
  },
  (product) => ({
    nameIdx: index("products_name_idx").on(product.name),
    subcategoryIdx: index("products_subcategory_idx").on(product.subcategoryId),
    serviceIdx: index("products_service_idx").on(product.serviceId),
  })
);
// export const productsRelations = relations(products, ({ one }) => ({
//   subcategory: one(categories, {
//     fields: [products.subcategoryId],
//     references: [categories.id],
//   }),
// }));
