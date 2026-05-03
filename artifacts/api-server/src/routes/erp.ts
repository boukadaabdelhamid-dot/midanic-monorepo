import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, requireStaff, isAdmin, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number =>
  parseInt(req.params[key] as string);

// ─── Employees ─────────────────────────────────────────────────────
router.get("/erp/employees", authenticate, requireAdmin, async (req, res) => {
  try {
    const employees = await db.select().from(schema.employeesTable).orderBy(schema.employeesTable.name);
    res.json(employees);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/employees", authenticate, requireAdmin, async (req, res) => {
  try {
    const [emp] = await db.insert(schema.employeesTable).values(req.body).returning();
    res.status(201).json(emp);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/employees/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const [emp] = await db.update(schema.employeesTable).set(req.body)
      .where(eq(schema.employeesTable.id, pid(req, "id"))).returning();
    if (!emp) { res.status(404).json({ error: "Not found" }); return; }
    res.json(emp);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/erp/employees/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.update(schema.employeesTable).set({ status: "inactive" })
      .where(eq(schema.employeesTable.id, pid(req, "id")));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Attendance
router.get("/erp/attendance", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.query as Record<string, string>;
    let query = db.select().from(schema.attendanceTable).$dynamic();
    if (employeeId) query = query.where(eq(schema.attendanceTable.employeeId, parseInt(employeeId)));
    const records = await query.orderBy(desc(schema.attendanceTable.date));
    res.json(records);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/attendance", authenticate, requireAdmin, async (req, res) => {
  try {
    const [record] = await db.insert(schema.attendanceTable).values(req.body).returning();
    res.status(201).json(record);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Leaves
router.get("/erp/leaves", authenticate, requireAdmin, async (req, res) => {
  try {
    const leaves = await db.select().from(schema.leavesTable).orderBy(desc(schema.leavesTable.createdAt));
    res.json(leaves);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/leaves", authenticate, requireAdmin, async (req, res) => {
  try {
    const [leave] = await db.insert(schema.leavesTable).values(req.body).returning();
    res.status(201).json(leave);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/leaves/:id/status", authenticate, requireAdmin, async (req, res) => {
  try {
    const [leave] = await db.update(schema.leavesTable).set({ status: req.body.status })
      .where(eq(schema.leavesTable.id, pid(req, "id"))).returning();
    if (!leave) { res.status(404).json({ error: "Not found" }); return; }
    const [employee] = await db.select({ name: schema.employeesTable.name })
      .from(schema.employeesTable).where(eq(schema.employeesTable.id, leave.employeeId)).limit(1);
    broadcastToAdmins({
      type: "leave_status_changed",
      status: leave.status,
      employeeName: employee?.name ?? `Employee #${leave.employeeId}`,
      leaveType: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
    });
    res.json(leave);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Suppliers ─────────────────────────────────────────────────────
router.get("/erp/suppliers", authenticate, requireAdmin, async (req, res) => {
  try {
    const suppliers = await db.select().from(schema.suppliersTable).orderBy(schema.suppliersTable.name);
    res.json(suppliers);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/suppliers", authenticate, requireAdmin, async (req, res) => {
  try {
    const [supplier] = await db.insert(schema.suppliersTable).values(req.body).returning();
    res.status(201).json(supplier);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/suppliers/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const [supplier] = await db.update(schema.suppliersTable).set(req.body)
      .where(eq(schema.suppliersTable.id, pid(req, "id"))).returning();
    res.json(supplier);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Purchase Orders
router.get("/erp/purchase-orders", authenticate, requireAdmin, async (req, res) => {
  try {
    const pos = await db.select().from(schema.purchaseOrdersTable).orderBy(desc(schema.purchaseOrdersTable.createdAt));
    res.json(pos);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/purchase-orders", authenticate, requireAdmin, async (req, res) => {
  try {
    const { supplierId, items, notes } = req.body;
    let total = 0;
    for (const item of (items || [])) { total += item.quantity * item.unitCost; }
    const [po] = await db.insert(schema.purchaseOrdersTable).values({ supplierId, notes, totalAmount: total.toFixed(2) }).returning();
    for (const item of (items || [])) {
      await db.insert(schema.purchaseItemsTable).values({ purchaseOrderId: po.id, ...item });
    }
    res.status(201).json(po);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/purchase-orders/:id/items", authenticate, requireAdmin, async (req, res) => {
  try {
    const poId = pid(req, "id");
    const items = await db.select({
      id: schema.purchaseItemsTable.id,
      purchaseOrderId: schema.purchaseItemsTable.purchaseOrderId,
      productId: schema.purchaseItemsTable.productId,
      quantity: schema.purchaseItemsTable.quantity,
      unitCost: schema.purchaseItemsTable.unitCost,
      productNameEn: schema.productsTable.nameEn,
      productNameAr: schema.productsTable.nameAr,
    })
      .from(schema.purchaseItemsTable)
      .leftJoin(schema.productsTable, eq(schema.productsTable.id, schema.purchaseItemsTable.productId))
      .where(eq(schema.purchaseItemsTable.purchaseOrderId, poId));
    res.json(items);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/purchase-orders/:id/receive", authenticate, requireAdmin, async (req, res) => {
  try {
    const poId = pid(req, "id");
    const [po] = await db.update(schema.purchaseOrdersTable)
      .set({ status: "received", receivedAt: new Date() })
      .where(eq(schema.purchaseOrdersTable.id, poId)).returning();

    if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

    const items = await db.select().from(schema.purchaseItemsTable)
      .where(eq(schema.purchaseItemsTable.purchaseOrderId, poId));

    for (const item of items) {
      const [product] = await db.select().from(schema.productsTable).where(eq(schema.productsTable.id, item.productId)).limit(1);
      if (product) {
        await db.update(schema.productsTable).set({ stock: product.stock + item.quantity }).where(eq(schema.productsTable.id, item.productId));
        await db.insert(schema.inventoryMovementsTable).values({
          productId: item.productId, type: "in", quantity: item.quantity,
          reason: "Purchase Order", reference: `PO-${poId}`,
        });
      }
    }

    const [supplier] = await db.select({ name: schema.suppliersTable.name })
      .from(schema.suppliersTable).where(eq(schema.suppliersTable.id, po.supplierId)).limit(1);
    broadcastToAdmins({
      type: "purchase_received",
      purchaseOrderId: poId,
      supplierName: supplier?.name ?? `Supplier #${po.supplierId}`,
      totalAmount: po.totalAmount,
    });
    res.json(po);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Inventory ─────────────────────────────────────────────────────
router.get("/erp/inventory/stock", authenticate, requireStaff, async (req, res) => {
  try {
    const products = await db.select({
      id: schema.productsTable.id,
      nameEn: schema.productsTable.nameEn,
      nameAr: schema.productsTable.nameAr,
      stock: schema.productsTable.stock,
    }).from(schema.productsTable).orderBy(schema.productsTable.stock);

    const result = products.map((p) => ({
      ...p,
      status: p.stock <= 3 ? "critical" : p.stock <= 10 ? "low" : "ok",
    }));

    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/inventory", authenticate, requireStaff, async (req, res) => {
  try {
    const movements = await db.select({
      id: schema.inventoryMovementsTable.id,
      type: schema.inventoryMovementsTable.type,
      quantity: schema.inventoryMovementsTable.quantity,
      reason: schema.inventoryMovementsTable.reason,
      reference: schema.inventoryMovementsTable.reference,
      createdAt: schema.inventoryMovementsTable.createdAt,
      productId: schema.inventoryMovementsTable.productId,
      product: { id: schema.productsTable.id, nameAr: schema.productsTable.nameAr, nameEn: schema.productsTable.nameEn },
    })
      .from(schema.inventoryMovementsTable)
      .leftJoin(schema.productsTable, eq(schema.inventoryMovementsTable.productId, schema.productsTable.id))
      .orderBy(desc(schema.inventoryMovementsTable.createdAt))
      .limit(100);
    res.json(movements);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/inventory/adjust", authenticate, requireAdmin, async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    const [product] = await db.select().from(schema.productsTable).where(eq(schema.productsTable.id, productId)).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    await db.update(schema.productsTable).set({ stock: product.stock + quantity }).where(eq(schema.productsTable.id, productId));
    const [mv] = await db.insert(schema.inventoryMovementsTable).values({
      productId, type: "adjustment", quantity, reason,
    }).returning();
    res.json(mv);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Accounting ────────────────────────────────────────────────────
router.get("/erp/transactions", authenticate, requireAdmin, async (req, res) => {
  try {
    const transactions = await db.select().from(schema.transactionsTable).orderBy(desc(schema.transactionsTable.date)).limit(200);
    res.json(transactions);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transactions", authenticate, requireAdmin, async (req, res) => {
  try {
    const [tx] = await db.insert(schema.transactionsTable).values(req.body).returning();
    res.status(201).json(tx);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/accounting-summary", authenticate, requireAdmin, async (req, res) => {
  try {
    const [{ income }] = await db.select({ income: sql<number>`coalesce(sum(amount),0)` })
      .from(schema.transactionsTable).where(eq(schema.transactionsTable.type, "income"));
    const [{ expenses }] = await db.select({ expenses: sql<number>`coalesce(sum(amount),0)` })
      .from(schema.transactionsTable).where(eq(schema.transactionsTable.type, "expense"));
    const monthly = await db.execute(sql`
      SELECT TO_CHAR(date::date, 'YYYY-MM') as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE date::date >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `);
    res.json({ totalIncome: Number(income), totalExpense: Number(expenses), netBalance: Number(income) - Number(expenses), monthly: monthly.rows });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CRM ───────────────────────────────────────────────────────────
router.get("/erp/customers", authenticate, requireStaff, async (req: AuthRequest, res) => {
  try {
    const customers = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.phone, u.address, u.city, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
      GROUP BY u.id, u.name, u.email, u.phone, u.address, u.city, u.created_at
      ORDER BY total_spent DESC
    `);
    if (isAdmin(req)) {
      res.json(customers.rows);
    } else {
      res.json(customers.rows.map((r: Record<string, unknown>) => {
        const { total_spent: _ts, ...rest } = r;
        return rest;
      }));
    }
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/customers", authenticate, requireStaff, async (req, res) => {
  try {
    const { name, email, password, preferredLang, phone, address, city, notes } = req.body || {};
    if (!name || !email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }
    const existing = await db.select({ id: schema.usersTable.id })
      .from(schema.usersTable).where(eq(schema.usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "A customer with this email already exists" });
      return;
    }
    const pwd = (password && String(password).length >= 6) ? String(password) : Math.random().toString(36).slice(2, 12);
    const passwordHash = await bcrypt.hash(pwd, 10);
    const [user] = await db.insert(schema.usersTable).values({
      name, email, passwordHash,
      role: "customer",
      preferredLang: preferredLang === "en" ? "en" : "ar",
      phone: phone || null,
      address: address || null,
      city: city || null,
      notes: notes || null,
    }).returning();
    res.status(201).json({
      id: user.id, name: user.name, email: user.email,
      phone: user.phone, address: user.address, city: user.city,
      total_orders: 0, total_spent: "0",
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/customers/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = pid(req, "id");
    const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Customer not found" }); return; }
    const orders = await db.select().from(schema.ordersTable).where(eq(schema.ordersTable.userId, userId)).orderBy(desc(schema.ordersTable.createdAt));
    const notes = await db.select().from(schema.customerNotesTable).where(eq(schema.customerNotesTable.userId, userId));
    res.json({ ...user, orders, notes });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/customers/:id/notes", authenticate, requireAdmin, async (req, res) => {
  try {
    const [note] = await db.insert(schema.customerNotesTable)
      .values({ userId: pid(req, "id"), note: req.body.note }).returning();
    res.status(201).json(note);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Staff (system users with admin/employee role) ────────────────
router.get("/erp/staff", authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, name, email, role, phone, created_at
      FROM users
      WHERE role IN ('admin', 'employee')
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/staff", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const wantedRole = role === "admin" ? "admin" : "employee";
    const existing = await db.select({ id: schema.usersTable.id })
      .from(schema.usersTable).where(eq(schema.usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const [user] = await db.insert(schema.usersTable).values({
      name, email, passwordHash,
      role: wantedRole,
      phone: phone || null,
    }).returning();
    res.status(201).json({
      id: user.id, name: user.name, email: user.email,
      role: user.role, phone: user.phone, created_at: user.createdAt,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/erp/staff/:id", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const targetId = pid(req, "id");
    if (req.user?.id === targetId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, targetId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    if (user.role === "customer") { res.status(400).json({ error: "Not a staff account" }); return; }
    await db.delete(schema.usersTable).where(eq(schema.usersTable.id, targetId));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
