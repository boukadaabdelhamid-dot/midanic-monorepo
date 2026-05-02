import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, optionalAuth, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";

const router = Router();

// POST /orders
router.post("/orders", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items, couponCode } = req.body;

    if (!customerName || !customerPhone || !customerAddress) {
      res.status(400).json({ error: "customerName, customerPhone, customerAddress required" });
      return;
    }

    let orderItems: { productId: number; quantity: number }[] = items || [];

    // If logged in and no items provided, use cart
    if (req.user && orderItems.length === 0) {
      const cartItems = await db.select().from(schema.cartItemsTable)
        .where(eq(schema.cartItemsTable.userId, req.user.id));
      orderItems = cartItems.map(c => ({ productId: c.productId, quantity: c.quantity }));
    }

    if (orderItems.length === 0) {
      res.status(400).json({ error: "No items in order" });
      return;
    }

    // Validate products and calculate total
    let subtotal = 0;
    const enrichedItems: { productId: number; quantity: number; unitPrice: number; product: typeof schema.productsTable.$inferSelect }[] = [];

    for (const item of orderItems) {
      const [product] = await db.select().from(schema.productsTable)
        .where(eq(schema.productsTable.id, item.productId)).limit(1);
      if (!product) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
      if (product.stock < item.quantity) { res.status(400).json({ error: `Insufficient stock for ${product.nameEn}` }); return; }
      subtotal += parseFloat(product.price) * item.quantity;
      enrichedItems.push({ ...item, unitPrice: parseFloat(product.price), product });
    }

    // Apply coupon
    let discountAmount = 0;
    let appliedCoupon: typeof schema.couponsTable.$inferSelect | null = null;
    if (couponCode) {
      const [coupon] = await db.select().from(schema.couponsTable)
        .where(eq(schema.couponsTable.code, couponCode.toUpperCase())).limit(1);
      if (coupon && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)) {
        if (coupon.type === "percent") discountAmount = (subtotal * parseFloat(coupon.value)) / 100;
        else discountAmount = parseFloat(coupon.value);
        appliedCoupon = coupon;
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    // Create order
    const [order] = await db.insert(schema.ordersTable).values({
      userId: req.user?.id || null,
      customerName, customerPhone, customerAddress,
      totalAmount: totalAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      couponCode: appliedCoupon?.code || null,
    }).returning();

    // Insert order items & update stock
    for (const item of enrichedItems) {
      await db.insert(schema.orderItemsTable).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
      });

      const newStock = item.product.stock - item.quantity;
      await db.update(schema.productsTable)
        .set({ stock: newStock })
        .where(eq(schema.productsTable.id, item.productId));

      // Insert inventory movement
      await db.insert(schema.inventoryMovementsTable).values({
        productId: item.productId,
        type: "out",
        quantity: item.quantity,
        reason: "Sale",
        reference: `ORDER-${order.id}`,
      });

      // Low stock alert
      if (newStock < 5) {
        broadcastToAdmins({ type: "low_stock", product: { id: item.productId, nameEn: item.product.nameEn, nameAr: item.product.nameAr, stock: newStock } });
      }
    }

    // Update coupon usage
    if (appliedCoupon) {
      await db.update(schema.couponsTable)
        .set({ usedCount: appliedCoupon.usedCount + 1 })
        .where(eq(schema.couponsTable.id, appliedCoupon.id));
    }

    // Clear cart if user is logged in
    if (req.user) {
      await db.delete(schema.cartItemsTable).where(eq(schema.cartItemsTable.userId, req.user.id));
    }

    // Insert income transaction
    await db.insert(schema.transactionsTable).values({
      type: "income",
      category: "sales",
      amount: totalAmount.toFixed(2),
      description: `Order #${order.id} - ${customerName}`,
      date: new Date().toISOString().split("T")[0],
      reference: `ORDER-${order.id}`,
    });

    // Broadcast new order to admins
    broadcastToAdmins({
      type: "new_order",
      order: { id: order.id, customerName, customerPhone, customerAddress, totalAmount, createdAt: order.createdAt },
    });

    res.status(201).json({ ...order, items: enrichedItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })) });
  } catch (err) {
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
      .where(eq(schema.ordersTable.id, parseInt(req.params.id))).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const items = await db.select({
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

    res.json({ ...order, items });
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
    const [order] = await db.update(schema.ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.ordersTable.id, parseInt(req.params.id)))
      .returning();
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
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
      .where(sql`${schema.productsTable.stock} < 5`).orderBy(schema.productsTable.stock);

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
