import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, type AuthRequest } from "../lib/auth";

const router = Router();

// GET /cart
router.get("/cart", authenticate, async (req: AuthRequest, res) => {
  try {
    const items = await db.select({
      id: schema.cartItemsTable.id,
      quantity: schema.cartItemsTable.quantity,
      product: {
        id: schema.productsTable.id,
        nameAr: schema.productsTable.nameAr,
        nameEn: schema.productsTable.nameEn,
        price: schema.productsTable.price,
        imageUrl: schema.productsTable.imageUrl,
        stock: schema.productsTable.stock,
      },
    })
      .from(schema.cartItemsTable)
      .leftJoin(schema.productsTable, eq(schema.cartItemsTable.productId, schema.productsTable.id))
      .where(eq(schema.cartItemsTable.userId, req.user!.id));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /cart
router.post("/cart", authenticate, async (req: AuthRequest, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({ error: "quantity must be a positive integer" });
      return;
    }
    const existing = await db.select().from(schema.cartItemsTable)
      .where(and(eq(schema.cartItemsTable.userId, req.user!.id), eq(schema.cartItemsTable.productId, productId)))
      .limit(1);

    if (existing.length > 0) {
      const [item] = await db.update(schema.cartItemsTable)
        .set({ quantity: existing[0].quantity + quantity })
        .where(eq(schema.cartItemsTable.id, existing[0].id))
        .returning();
      res.json(item);
    } else {
      const [item] = await db.insert(schema.cartItemsTable)
        .values({ userId: req.user!.id, productId, quantity })
        .returning();
      res.status(201).json(item);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /cart/:productId
router.put("/cart/:productId", authenticate, async (req: AuthRequest, res) => {
  try {
    const { quantity } = req.body;
    const productId = parseInt(req.params["productId"] as string);
    if (quantity <= 0) {
      await db.delete(schema.cartItemsTable)
        .where(and(eq(schema.cartItemsTable.userId, req.user!.id), eq(schema.cartItemsTable.productId, productId)));
      res.json({ success: true });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({ error: "quantity must be a positive integer" });
      return;
    }
    const [item] = await db.update(schema.cartItemsTable)
      .set({ quantity })
      .where(and(eq(schema.cartItemsTable.userId, req.user!.id), eq(schema.cartItemsTable.productId, productId)))
      .returning();
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /cart/:productId
router.delete("/cart/:productId", authenticate, async (req: AuthRequest, res) => {
  try {
    await db.delete(schema.cartItemsTable)
      .where(and(eq(schema.cartItemsTable.userId, req.user!.id), eq(schema.cartItemsTable.productId, parseInt(req.params["productId"] as string))));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /coupons/validate
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const [coupon] = await db.select().from(schema.couponsTable)
      .where(eq(schema.couponsTable.code, (code as string).toUpperCase())).limit(1);

    if (!coupon) { res.status(404).json({ error: "Coupon not found" }); return; }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.status(400).json({ error: "Coupon expired" }); return;
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ error: "Coupon usage limit reached" }); return;
    }
    if (orderTotal < parseFloat(coupon.minOrder)) {
      res.status(400).json({ error: `Minimum order: ${coupon.minOrder}` }); return;
    }

    const discount = coupon.type === "percent"
      ? (orderTotal * parseFloat(coupon.value)) / 100
      : parseFloat(coupon.value);

    res.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount: discount.toFixed(2) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
