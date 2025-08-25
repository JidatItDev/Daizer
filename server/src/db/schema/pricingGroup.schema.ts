import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const pricingGroups = pgTable(
  "pricing_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (pricingGroup) => ({
    nameIdx: index("pricing_groups_name_idx").on(pricingGroup.name),
    isDefaultIdx: index("pricing_groups_is_default_idx").on(
      pricingGroup.isDefault
    ),
  })
);
