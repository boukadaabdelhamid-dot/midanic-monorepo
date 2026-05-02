import { Router } from "express";
import { eq, desc, sql, lt } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, optionalAuth, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";
import { sendOrderConfirmationSMS, sendAdminOrderAlertSMS } from "../lib/sms";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number => {
  const n = parseInt(req.params[key] as string);
  if (isNaN(n)) throw Object.assign(new Error("Invalid numeric id"), { statusCode: 400 });
  return n;
};

// POST /orders — atomic checkout wrapped in a DB transaction
router.post("/orders", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items, couponCode } = req.body;

    if (!customerName || !customerPhone || !customerAddress) {
      res.status(400).json({ error: "customerName, customerPhone, customerAddress required" });
      return;
    }

    let orderItems: { productId: number; quantity: number }[] = items || [];

    // Validate each item quantity before anything else
    for (const item of orderItems) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ error: `Invalid quantity for product ${item.productId}: must be a positive integer` });
        return;
      }
    }

    // Consolidate duplicate productIds to avoid stock check/update races on the same row
    const consolidated = new Map<number, number>();
    for (const item of orderItems) {
      consolidated.set(item.productId, (consolidated.get(item.productId) ?? 0) + item.quantity);
    }
    orderItems = Array.from(consolidated.entries()).map(([productId, quantity]) => ({ productId, quantity }));

    if (req.user && orderItems.length === 0) {
      const cartItems = await db.select().from(schema.cartItemsTable)
        .where(eq(schema.cartItemsTable.userId, req.user.id));
      orderItems = cartItems.map(c => ({ productId: c.productId, quantity: c.quantity }));
    }

    if (orderItems.length === 0) {
      res.status(400).json({ error: "No items in order" });
      return;
    }

    // Run the entire checkout atomically
    const result = await db.transaction(async (tx) => {
      let subtotal = 0;
      const enrichedItems: { productId: number; quantity: number; unitPrice: number; product: typeof schema.productsTable.$inferSelect }[] = [];

      for (const item of orderItems) {
        // Lock the product row to prevent concurrent stock overwrites
        const [product] = await tx.select().from(schema.productsTable)
          .where(eq(schema.productsTable.id, item.productId))
          .for("update")
          .limit(1);

        if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
        if (product.stock < item.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for ${product.nameEn}: ${product.stock} available`),
            { status: 400 }
          );
        }
        subtotal += parseFloat(product.price) * item.quantity;
        enrichedItems.push({ ...item, unitPrice: parseFloat(product.price), product });
      }

      // Validate and apply coupon
      let discountAmount = 0;
      let appliedCoupon: typeof schema.couponsTable.$inferSelect | null = null;
      if (couponCode) {
        const [coupon] = await tx.select().from(schema.couponsTable)
          .where(eq(schema.couponsTable.code, (couponCode as string).toUpperCase()))
          .for("update")
          .limit(1);

        if (!coupon) throw Object.assign(new Error("Coupon not found"), { status: 400 });
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          throw Object.assign(new Error("Coupon has expired"), { status: 400 });
        }
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw Object.assign(new Error("Coupon usage limit reached"), { status: 400 });
        }
        if (coupon.minOrder && subtotal < parseFloat(coupon.minOrder)) {
          throw Object.assign(
            new Error(`Minimum order of SAR ${coupon.minOrder} required for this coupon`),
            { status: 400 }
          );
        }

        if (coupon.type === "percent") discountAmount = (subtotal * parseFloat(coupon.value)) / 100;
        else discountAmount = Math.min(parseFloat(coupon.value), subtotal);
        appliedCoupon = coupon;
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

      const [order] = await tx.insert(schema.ordersTable).values({
        userId: req.user?.id ?? null,
        customerName, customerPhone, customerAddress,
        totalAmount: totalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponCode: appliedCoupon?.code ?? null,
      }).returning();

      for (const item of enrichedItems) {
        await tx.insert(schema.orderItemsTable).values({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
        });

        const newStock = item.product.stock - item.quantity;
        await tx.update(schema.productsTable)
          .set({ stock: newStock })
          .where(eq(schema.productsTable.id, item.productId));

        await tx.insert(schema.inventoryMovementsTable).values({
          productId: item.productId,
          type: "out",
          quantity: item.quantity,
          reason: "Sale",
          reference: `ORDER-${order.id}`,
        });

        // Collect low-stock items for post-commit broadcast
        if (newStock < 5) {
          enrichedItems.find(e => e.productId === item.productId)!.product = { ...item.product, stock: newStock };
        }
      }

      if (appliedCoupon) {
        await tx.update(schema.couponsTable)
          .set({ usedCount: appliedCoupon.usedCount + 1 })
          .where(eq(schema.couponsTable.id, appliedCoupon.id));
      }

      if (req.user) {
        await tx.delete(schema.cartItemsTable).where(eq(schema.cartItemsTable.userId, req.user.id));
      }

      await tx.insert(schema.transactionsTable).values({
        type: "income",
        category: "sales",
        amount: totalAmount.toFixed(2),
        description: `Order #${order.id} - ${customerName}`,
        date: new Date().toISOString().split("T")[0],
        reference: `ORDER-${order.id}`,
      });

      return { order, enrichedItems, totalAmount };
    });

    // Broadcast after transaction commits successfully
    broadcastToAdmins({
      type: "new_order",
      order: { id: result.order.id, customerName, customerPhone, customerAddress, totalAmount: result.totalAmount, createdAt: result.order.createdAt },
    });

    // Send SMS notifications (fire-and-forget, never blocks the response)
    sendOrderConfirmationSMS(customerPhone, result.order.id, result.totalAmount, customerName).catch(() => {});
    sendAdminOrderAlertSMS(result.order.id, customerName, result.totalAmount).catch(() => {});
    for (const item of result.enrichedItems) {
      if (item.product.stock < 5) {
        broadcastToAdmins({ type: "low_stock", product: { id: item.productId, nameEn: item.product.nameEn, nameAr: item.product.nameAr, stock: item.product.stock } });
      }
    }

    res.status(201).json({
      ...result.order,
      items: result.enrichedItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 400) {
      res.status(400).json({ error: e.message });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /orders (user's orders)
router.get("/orders", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await db.select().from(schema.ordersTable)
      .where(eq(schema.ordersTable.userId, req.user!.id))
      .orderBy(desc(schema.ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /orders/:id
router.get("/orders/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const [order] = await db.select().from(schema.ordersTable)
      .where(eq(schema.ordersTable.id, pid(req, "id"))).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const orderItems = await db.select({
      quantity: schema.orderItemsTable.quantity,
      unitPrice: schema.orderItemsTable.unitPrice,
      product: {
        id: schema.productsTable.id,
        nameAr: schema.productsTable.nameAr,
        nameEn: schema.productsTable.nameEn,
        imageUrl: schema.productsTable.imageUrl,
      },
    })
      .from(schema.orderItemsTable)
      .leftJoin(schema.productsTable, eq(schema.orderItemsTable.productId, schema.productsTable.id))
      .where(eq(schema.orderItemsTable.orderId, order.id));

    res.json({ ...order, items: orderItems });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/orders
router.get("/admin/orders", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const orders = await db.select().from(schema.ordersTable).orderBy(desc(schema.ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/orders/:id/status
router.put("/admin/orders/:id/status", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }
    const [order] = await db.update(schema.ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.ordersTable.id, pid(req, "id")))
      .returning();
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/low-stock — dedicated low-stock alert endpoint
router.get("/admin/low-stock", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const raw = parseInt((req.query["threshold"] as string) || "5");
    const threshold = isNaN(raw) ? 5 : Math.max(0, raw);
    const lowStock = await db.select().from(schema.productsTable)
      .where(lt(schema.productsTable.stock, threshold))
      .orderBy(schema.productsTable.stock);
    res.json(lowStock);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/analytics
router.get("/admin/analytics", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [{ totalOrders }] = await db.select({ totalOrders: sql<number>`count(*)` }).from(schema.ordersTable);
    const [{ totalRevenue }] = await db.select({ totalRevenue: sql<number>`coalesce(sum(total_amount), 0)` }).from(schema.ordersTable);
    const [{ totalExpenses }] = await db.select({ totalExpenses: sql<number>`coalesce(sum(amount), 0)` })
      .from(schema.transactionsTable).where(eq(schema.transactionsTable.type, "expense"));
    const [{ pendingOrders }] = await db.select({ pendingOrders: sql<number>`count(*)` })
      .from(schema.ordersTable).where(eq(schema.ordersTable.status, "pending"));

    const dailySales = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `);

    const topProducts = await db.execute(sql`
      SELECT p.id, p.name_ar, p.name_en, SUM(oi.quantity) as sold, SUM(oi.quantity * oi.unit_price) as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      GROUP BY p.id, p.name_ar, p.name_en
      ORDER BY sold DESC
      LIMIT 5
    `);

    const lowStock = await db.select().from(schema.productsTable)
      .where(lt(schema.productsTable.stock, 5)).orderBy(schema.productsTable.stock);

    res.json({
      totalOrders: Number(totalOrders),
      totalRevenue: Number(totalRevenue),
      totalExpenses: Number(totalExpenses),
      netProfit: Number(totalRevenue) - Number(totalExpenses),
      pendingOrders: Number(pendingOrders),
      dailySales: dailySales.rows,
      topProducts: topProducts.rows,
      lowStock,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
