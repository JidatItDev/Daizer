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

    // ✅ self-referencing foreign key with cascade delete
    parentCategoryFk: foreignKey({
      columns: [category.parentCategoryId],
      foreignColumns: [category.id],
    }).onDelete("cascade"),
  })
);
