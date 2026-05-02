import { Router } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, type AuthRequest } from "../lib/auth";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number => {
  const n = parseInt(req.params[key] as string);
  if (isNaN(n)) throw Object.assign(new Error("Invalid numeric id"), { statusCode: 400 });
  return n;
};

// GET /products
router.get("/products", async (req, res) => {
  try {
    const { search, categoryId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${ilike(schema.productsTable.nameAr, `%${search}%`)} OR ${ilike(schema.productsTable.nameEn, `%${search}%`)})`
      );
    }
    if (categoryId) {
      conditions.push(eq(schema.productsTable.categoryId, parseInt(categoryId)));
    }

    const products = await db.select().from(schema.productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(parseInt(limit))
      .offset(offset)
      .orderBy(schema.productsTable.createdAt);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ products, total: Number(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(schema.productsTable)
      .where(eq(schema.productsTable.id, pid(req, "id"))).limit(1);
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
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products (admin)
router.post("/products", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { nameAr, nameEn, descriptionAr, descriptionEn, price, imageUrl, stock, categoryId, reference, barcode, costPrice, catalogueType } = req.body;
    const [product] = await db.insert(schema.productsTable).values({
      nameAr, nameEn,
      descriptionAr: descriptionAr || "",
      descriptionEn: descriptionEn || "",
      price, imageUrl, stock: stock || 0, categoryId,
      reference: reference || null,
      barcode: barcode || null,
      costPrice: costPrice || null,
      catalogueType: catalogueType || "ARTICLE",
    }).returning();
    res.status(201).json(product);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /products/:id (admin)
router.put("/products/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [product] = await db.update(schema.productsTable)
      .set(req.body)
      .where(eq(schema.productsTable.id, pid(req, "id")))
      .returning();
    if (!product) { res.status(404).json({ error: "Not found" }); return; }
    res.json(product);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /products/:id (admin)
router.delete("/products/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await db.delete(schema.productsTable).where(eq(schema.productsTable.id, pid(req, "id")));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await db.select().from(schema.categoriesTable).orderBy(schema.categoriesTable.id);
    res.json(categories);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /categories (admin)
router.post("/categories", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [cat] = await db.insert(schema.categoriesTable).values(req.body).returning();
    res.status(201).json(cat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /categories/:id (admin)
router.put("/categories/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [cat] = await db.update(schema.categoriesTable).set(req.body)
      .where(eq(schema.categoriesTable.id, pid(req, "id"))).returning();
    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    res.json(cat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /categories/:id (admin)
router.delete("/categories/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = pid(req, "id");
    await db.delete(schema.categoriesTable).where(eq(schema.categoriesTable.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 400) {
      res.status(400).json({ error: e.message ?? "Bad request" });
      return;
    }
    // PostgreSQL FK violation code 23503
    if (e.code === "23503") {
      res.status(409).json({ error: "Cannot delete category: products are assigned to it. Reassign or delete those products first." });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /products/:id/reviews
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
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
