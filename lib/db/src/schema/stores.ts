import { pgTable, serial, text, timestamp, integer, boolean, primaryKey, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  tvaRate: numeric("tva_rate", { precision: 5, scale: 2 }).notNull().default("19"),
  showTvaByDefault: boolean("show_tva_by_default").notNull().default(false),
  nif: text("nif"),
  rc: text("rc"),
  ai: text("ai"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStoresTable = pgTable("user_stores", {
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  storeId: integer("store_id").references(() => storesTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.storeId] }),
}));

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true, createdAt: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
export type UserStore = typeof userStoresTable.$inferSelect;
