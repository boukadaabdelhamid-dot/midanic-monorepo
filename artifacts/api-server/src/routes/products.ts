import { Router } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, requireStore, optionalAuth, type AuthRequest } from "../lib/auth";
import { resolvePublicStore } from "../lib/store-context";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number => {
  const n = parseInt(req.params[key] as string);
  if (isNaN(n)) throw Object.assign(new Error("Invalid numeric id"), { statusCode: 400 });
  return n;
};

// GET /products — public storefront list (filtered by store)
// For ERP, the same client sends Authorization+selected store; we still filter by req.currentStoreId
router.get("/products", optionalAuth, async (req: AuthRequest, res, next) => {
  // optionalAuth populates req.currentStoreId from a valid JWT if present.
  // Anonymous, customer (no store), or invalid bearer → fall back to public.
  if (req.currentStoreId) return handleListProducts(req, res);
  return resolvePublicStore(req, res, () => handleListProducts(req, res));
});

async function handleListProducts(req: AuthRequest, res: import("express").Response) {
  try {
    const storeId = req.currentStoreId!;
    const { search, categoryId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(schema.productsTable.storeId, storeId)];
    if (search) {
      conditions.push(
        sql`(${ilike(schema.productsTable.nameAr, `%${search}%`)} OR ${ilike(schema.productsTable.nameEn, `%${search}%`)})`,
      );
    }
    if (categoryId) {
      conditions.push(eq(schema.productsTable.categoryId, parseInt(categoryId)));
    }

    const products = await db.select().from(schema.productsTable)
      .where(and(...conditions))
      .limit(parseInt(limit))
      .offset(offset)
      .orderBy(schema.productsTable.createdAt);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.productsTable)
      .where(and(...conditions));

    res.set("Cache-Control", "no-store");
    res.json({ products, total: Number(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
}

// GET /products/:id — public, store-scoped
router.get("/products/:id", optionalAuth, async (req: AuthRequest, res) => {
  if (req.currentStoreId) return handleGetProduct(req, res);
  return resolvePublicStore(req, res, () => handleGetProduct(req, res));
});

async function handleGetProduct(req: AuthRequest, res: import("express").Response) {
  try {
    const storeId = req.currentStoreId!;
    const id = parseInt(req.params["id"] as string);
    const [product] = await db.select().from(schema.productsTable)
      .where(and(eq(schema.productsTable.id, id), eq(schema.productsTable.storeId, storeId))).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const reviews = await db.select({
      id: schema.productReviewsTable.id,
      rating: schema.productReviewsTable.rating,
      comment: schema.productReviewsTable.comment,
      createdAt: schema.productReviewsTable.createdAt,
      userName: schema.usersTable.name,
    })
      .from(schema.productReviewsTable)
      .leftJoin(schema.usersTable, eq(schema.productReviewsTable.userId, schema.usersTable.id))
      .where(eq(schema.productReviewsTable.productId, product.id))
      .orderBy(schema.productReviewsTable.createdAt);

    res.json({ ...product, reviews });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
}

// POST /products (admin)
router.post("/products", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const {
      nameAr, nameEn, descriptionAr, descriptionEn, price, imageUrl, stock, categoryId,
      reference, barcode, costPrice, catalogueType,
      brand, model, color, colisage, weight,
      priceGros, priceSemiGros, priceMin,
      catalogue1, catalogue2, catalogue3, catalogue4, catalogue5, catalogue6,
      isActive, isExposed,
    } = req.body;
    if (categoryId != null) {
      const [cat] = await db.select({ id: schema.categoriesTable.id })
        .from(schema.categoriesTable)
        .where(and(eq(schema.categoriesTable.id, Number(categoryId)), eq(schema.categoriesTable.storeId, storeId)))
        .limit(1);
      if (!cat) { res.status(400).json({ error: "categoryId does not belong to current store" }); return; }
    }
    const [product] = await db.insert(schema.productsTable).values({
      storeId,
      nameAr, nameEn,
      descriptionAr: descriptionAr || "",
      descriptionEn: descriptionEn || "",
      price, imageUrl, stock: stock || 0, categoryId,
      reference: reference || null,
      barcode: barcode || null,
      costPrice: costPrice || null,
      catalogueType: catalogueType || "ARTICLE",
      brand: brand || null,
      model: model || null,
      color: color || null,
      colisage: colisage || 1,
      weight: weight || null,
      priceGros: priceGros || null,
      priceSemiGros: priceSemiGros || null,
      priceMin: priceMin || null,
      catalogue1: catalogue1 || null,
      catalogue2: catalogue2 || null,
      catalogue3: catalogue3 || null,
      catalogue4: catalogue4 || null,
      catalogue5: catalogue5 || null,
      catalogue6: catalogue6 || null,
      isActive: isActive !== undefined ? isActive : true,
      isExposed: isExposed || false,
    }).returning();
    res.status(201).json(product);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// PUT /products/:id (admin) — store-scoped
router.put("/products/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const id = pid(req, "id");
    // Drop any storeId from body — never let client move products across stores
    const body = { ...req.body };
    delete body.storeId;
    if (body.categoryId != null) {
      const [cat] = await db.select({ id: schema.categoriesTable.id })
        .from(schema.categoriesTable)
        .where(and(eq(schema.categoriesTable.id, Number(body.categoryId)), eq(schema.categoriesTable.storeId, storeId)))
        .limit(1);
      if (!cat) { res.status(400).json({ error: "categoryId does not belong to current store" }); return; }
    }
    const [product] = await db.update(schema.productsTable)
      .set(body)
      .where(and(eq(schema.productsTable.id, id), eq(schema.productsTable.storeId, storeId)))
      .returning();
    if (!product) { res.status(404).json({ error: "Not found" }); return; }
    res.json(product);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// DELETE /products/:id (admin) — store-scoped
router.delete("/products/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    await db.delete(schema.productsTable)
      .where(and(eq(schema.productsTable.id, pid(req, "id")), eq(schema.productsTable.storeId, storeId)));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// GET /categories — public
router.get("/categories", optionalAuth, async (req: AuthRequest, res) => {
  const handler = async () => {
    try {
      const storeId = req.currentStoreId!;
      const categories = await db.select().from(schema.categoriesTable)
        .where(eq(schema.categoriesTable.storeId, storeId))
        .orderBy(schema.categoriesTable.id);
      res.json(categories);
    } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
  };
  if (req.currentStoreId) return handler();
  return resolvePublicStore(req, res, handler);
});

// POST /categories (admin)
router.post("/categories", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const body = { ...req.body, storeId };
    const [cat] = await db.insert(schema.categoriesTable).values(body).returning();
    res.status(201).json(cat);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/categories/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const body = { ...req.body }; delete body.storeId;
    const [cat] = await db.update(schema.categoriesTable).set(body)
      .where(and(eq(schema.categoriesTable.id, pid(req, "id")), eq(schema.categoriesTable.storeId, storeId)))
      .returning();
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    res.json(cat);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/categories/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const id = pid(req, "id");
    await db.delete(schema.categoriesTable)
      .where(and(eq(schema.categoriesTable.id, id), eq(schema.categoriesTable.storeId, storeId)));
    res.json({ success: true });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 400) { res.status(400).json({ error: e.message ?? "Bad request" }); return; }
    if (e.code === "23503") {
      res.status(409).json({ error: "Cannot delete category: products are assigned to it. Reassign or delete those products first." });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products/:id/reviews (no store filter; review references product id which is implicitly scoped)
router.post("/products/:id/reviews", authenticate, async (req: AuthRequest, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be 1-5" });
      return;
    }
    const productId = pid(req, "id");
    const [review] = await db.insert(schema.productReviewsTable).values({
      productId, userId: req.user!.id, rating, comment,
    }).returning();

    const reviews = await db.select({ rating: schema.productReviewsTable.rating })
      .from(schema.productReviewsTable).where(eq(schema.productReviewsTable.productId, productId));
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await db.update(schema.productsTable)
      .set({ rating: avg.toFixed(2), reviewCount: reviews.length })
      .where(eq(schema.productsTable.id, productId));

    res.status(201).json(review);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
