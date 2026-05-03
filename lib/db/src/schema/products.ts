import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { storesTable } from "./stores";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reference: text("reference"),
  barcode: text("barcode"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  catalogueType: text("catalogue_type").default("ARTICLE"),
  brand: text("brand"),
  model: text("model"),
  color: text("color"),
  colisage: integer("colisage").default(1),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  priceGros: numeric("price_gros", { precision: 10, scale: 2 }),
  priceSemiGros: numeric("price_semi_gros", { precision: 10, scale: 2 }),
  priceMin: numeric("price_min", { precision: 10, scale: 2 }),
  catalogue1: text("catalogue1"),
  catalogue2: text("catalogue2"),
  catalogue3: text("catalogue3"),
  catalogue4: text("catalogue4"),
  catalogue5: text("catalogue5"),
  catalogue6: text("catalogue6"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isExposed: integer("is_exposed", { mode: "boolean" }).default(false),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
