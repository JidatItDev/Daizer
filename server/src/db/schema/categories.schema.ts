import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";
// -------------------------
// Categories (with self-reference)
// -------------------------
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    parentCategoryId: uuid("parent_category_id"),
    image: jsonb("image").$type<{ name: string; url: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (category) => ({
    nameIdx: index("categories_name_idx").on(category.name),
    parentIdx: index("categories_parent_idx").on(category.parentCategoryId),

    parentCategoryFk: foreignKey({
      columns: [category.parentCategoryId],
      foreignColumns: [category.id],
    }).onDelete("cascade"),
  })
);
// export const categoriesRelations = relations(categories, ({ one, many }) => ({
//   parent: one(categories, {
//     fields: [categories.parentCategoryId],
//     references: [categories.id],
//   }),
//   children: many(categories), // for subcategories
//   products: many(products),
// }));
