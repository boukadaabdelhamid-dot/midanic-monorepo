import { Router } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, requireStaff, requireStore, isAdmin, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number =>
  parseInt(req.params[key] as string);

// ─── Employees ─────────────────────────────────────────────────────
router.get("/erp/employees", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const employees = await db.select().from(schema.employeesTable)
      .where(eq(schema.employeesTable.storeId, storeId))
      .orderBy(schema.employeesTable.name);
    res.json(employees);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/employees", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body, storeId: req.currentStoreId! };
    const [emp] = await db.insert(schema.employeesTable).values(body).returning();
    res.status(201).json(emp);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/employees/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const body = { ...req.body }; delete body.storeId;
    const [emp] = await db.update(schema.employeesTable).set(body)
      .where(and(eq(schema.employeesTable.id, pid(req, "id")), eq(schema.employeesTable.storeId, storeId)))
      .returning();
    if (!emp) { res.status(404).json({ error: "Not found" }); return; }
    res.json(emp);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/erp/employees/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    await db.update(schema.employeesTable).set({ status: "inactive" })
      .where(and(eq(schema.employeesTable.id, pid(req, "id")), eq(schema.employeesTable.storeId, storeId)));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Attendance
router.get("/erp/attendance", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const { employeeId } = req.query as Record<string, string>;
    const conditions = [eq(schema.attendanceTable.storeId, storeId)];
    if (employeeId) conditions.push(eq(schema.attendanceTable.employeeId, parseInt(employeeId)));
    const records = await db.select().from(schema.attendanceTable)
      .where(and(...conditions))
      .orderBy(desc(schema.attendanceTable.date));
    res.json(records);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/attendance", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body, storeId: req.currentStoreId! };
    const [record] = await db.insert(schema.attendanceTable).values(body).returning();
    res.status(201).json(record);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Leaves
router.get("/erp/leaves", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const leaves = await db.select().from(schema.leavesTable)
      .where(eq(schema.leavesTable.storeId, storeId))
      .orderBy(desc(schema.leavesTable.createdAt));
    res.json(leaves);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/leaves", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body, storeId: req.currentStoreId! };
    const [leave] = await db.insert(schema.leavesTable).values(body).returning();
    res.status(201).json(leave);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/leaves/:id/status", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const [leave] = await db.update(schema.leavesTable).set({ status: req.body.status })
      .where(and(eq(schema.leavesTable.id, pid(req, "id")), eq(schema.leavesTable.storeId, storeId)))
      .returning();
    if (!leave) { res.status(404).json({ error: "Not found" }); return; }
    const [employee] = await db.select({ name: schema.employeesTable.name })
      .from(schema.employeesTable).where(eq(schema.employeesTable.id, leave.employeeId)).limit(1);
    broadcastToAdmins({
      type: "leave_status_changed",
      storeId,
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
router.get("/erp/suppliers", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const suppliers = await db.select().from(schema.suppliersTable)
      .where(eq(schema.suppliersTable.storeId, storeId))
      .orderBy(schema.suppliersTable.name);
    res.json(suppliers);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/suppliers", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body, storeId: req.currentStoreId! };
    const [supplier] = await db.insert(schema.suppliersTable).values(body).returning();
    res.status(201).json(supplier);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/suppliers/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const body = { ...req.body }; delete body.storeId;
    const [supplier] = await db.update(schema.suppliersTable).set(body)
      .where(and(eq(schema.suppliersTable.id, pid(req, "id")), eq(schema.suppliersTable.storeId, storeId)))
      .returning();
    if (!supplier) { res.status(404).json({ error: "Not found" }); return; }
    res.json(supplier);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Purchase Orders
router.get("/erp/purchase-orders", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const pos = await db.select().from(schema.purchaseOrdersTable)
      .where(eq(schema.purchaseOrdersTable.storeId, storeId))
      .orderBy(desc(schema.purchaseOrdersTable.createdAt));
    res.json(pos);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/purchase-orders", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const { supplierId, items, notes } = req.body;
    // Verify supplier belongs to this store
    const [sup] = await db.select({ id: schema.suppliersTable.id }).from(schema.suppliersTable)
      .where(and(eq(schema.suppliersTable.id, supplierId), eq(schema.suppliersTable.storeId, storeId))).limit(1);
    if (!sup) { res.status(400).json({ error: "Supplier not found in this store" }); return; }
    // Verify every productId belongs to this store before inserting items
    for (const item of (items || [])) {
      const [prod] = await db.select({ id: schema.productsTable.id }).from(schema.productsTable)
        .where(and(eq(schema.productsTable.id, item.productId), eq(schema.productsTable.storeId, storeId))).limit(1);
      if (!prod) { res.status(400).json({ error: `Product ${item.productId} not found in this store` }); return; }
    }
    let total = 0;
    for (const item of (items || [])) { total += item.quantity * item.unitCost; }
    const [po] = await db.insert(schema.purchaseOrdersTable).values({
      storeId, supplierId, notes, totalAmount: total.toFixed(2),
    }).returning();
    for (const item of (items || [])) {
      await db.insert(schema.purchaseItemsTable).values({ purchaseOrderId: po.id, ...item });
    }
    res.status(201).json(po);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/purchase-orders/:id/items", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const poId = pid(req, "id");
    // Make sure the PO belongs to this store
    const [po] = await db.select({ id: schema.purchaseOrdersTable.id }).from(schema.purchaseOrdersTable)
      .where(and(eq(schema.purchaseOrdersTable.id, poId), eq(schema.purchaseOrdersTable.storeId, storeId))).limit(1);
    if (!po) { res.status(404).json({ error: "Not found" }); return; }
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
      // Only join product names when the product belongs to current store
      .leftJoin(schema.productsTable,
        and(
          eq(schema.productsTable.id, schema.purchaseItemsTable.productId),
          eq(schema.productsTable.storeId, storeId),
        ))
      .where(eq(schema.purchaseItemsTable.purchaseOrderId, poId));
    res.json(items);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/purchase-orders/:id/receive", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const poId = pid(req, "id");
    const [po] = await db.update(schema.purchaseOrdersTable)
      .set({ status: "received", receivedAt: new Date() })
      .where(and(eq(schema.purchaseOrdersTable.id, poId), eq(schema.purchaseOrdersTable.storeId, storeId)))
      .returning();

    if (!po) { res.status(404).json({ error: "Purchase order not found" }); return; }

    const items = await db.select().from(schema.purchaseItemsTable)
      .where(eq(schema.purchaseItemsTable.purchaseOrderId, poId));

    for (const item of items) {
      const [product] = await db.select().from(schema.productsTable)
        .where(and(eq(schema.productsTable.id, item.productId), eq(schema.productsTable.storeId, storeId))).limit(1);
      if (product) {
        await db.update(schema.productsTable).set({ stock: product.stock + item.quantity }).where(eq(schema.productsTable.id, item.productId));
        await db.insert(schema.inventoryMovementsTable).values({
          storeId,
          productId: item.productId, type: "in", quantity: item.quantity,
          reason: "Purchase Order", reference: `PO-${poId}`,
        });
      }
    }

    const [supplier] = await db.select({ name: schema.suppliersTable.name })
      .from(schema.suppliersTable).where(eq(schema.suppliersTable.id, po.supplierId)).limit(1);
    broadcastToAdmins({
      type: "purchase_received",
      storeId,
      purchaseOrderId: poId,
      supplierName: supplier?.name ?? `Supplier #${po.supplierId}`,
      totalAmount: po.totalAmount,
    });
    res.json(po);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Inventory ─────────────────────────────────────────────────────
router.get("/erp/inventory/stock", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const products = await db.select({
      id: schema.productsTable.id,
      nameEn: schema.productsTable.nameEn,
      nameAr: schema.productsTable.nameAr,
      stock: schema.productsTable.stock,
    }).from(schema.productsTable)
      .where(eq(schema.productsTable.storeId, storeId))
      .orderBy(schema.productsTable.stock);

    const result = products.map((p) => ({
      ...p,
      status: p.stock <= 3 ? "critical" : p.stock <= 10 ? "low" : "ok",
    }));

    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/inventory", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
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
      .where(eq(schema.inventoryMovementsTable.storeId, storeId))
      .orderBy(desc(schema.inventoryMovementsTable.createdAt))
      .limit(100);
    res.json(movements);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/inventory/adjust", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const { productId, quantity, reason } = req.body;
    const [product] = await db.select().from(schema.productsTable)
      .where(and(eq(schema.productsTable.id, productId), eq(schema.productsTable.storeId, storeId))).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found in this store" }); return; }
    await db.update(schema.productsTable).set({ stock: product.stock + quantity })
      .where(eq(schema.productsTable.id, productId));
    const [mv] = await db.insert(schema.inventoryMovementsTable).values({
      storeId, productId, type: "adjustment", quantity, reason,
    }).returning();
    res.json(mv);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Accounting ────────────────────────────────────────────────────
router.get("/erp/transactions", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const transactions = await db.select().from(schema.transactionsTable)
      .where(eq(schema.transactionsTable.storeId, storeId))
      .orderBy(desc(schema.transactionsTable.date)).limit(200);
    res.json(transactions);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transactions", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const body = { ...req.body, storeId: req.currentStoreId! };
    const [tx] = await db.insert(schema.transactionsTable).values(body).returning();
    res.status(201).json(tx);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/erp/accounting-summary", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const [{ income }] = await db.select({ income: sql<number>`coalesce(sum(amount),0)` })
      .from(schema.transactionsTable)
      .where(and(eq(schema.transactionsTable.type, "income"), eq(schema.transactionsTable.storeId, storeId)));
    const [{ expenses }] = await db.select({ expenses: sql<number>`coalesce(sum(amount),0)` })
      .from(schema.transactionsTable)
      .where(and(eq(schema.transactionsTable.type, "expense"), eq(schema.transactionsTable.storeId, storeId)));
    const monthly = await db.execute(sql`
      SELECT TO_CHAR(date::date, 'YYYY-MM') as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE date::date >= NOW() - INTERVAL '12 months' AND store_id = ${storeId}
      GROUP BY month ORDER BY month
    `);
    res.json({ totalIncome: Number(income), totalExpense: Number(expenses), netBalance: Number(income) - Number(expenses), monthly: monthly.rows });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CRM ───────────────────────────────────────────────────────────
// Customers are scoped to the store via their ORDER history. A customer who
// never purchased from this store will not appear here.
router.get("/erp/customers", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const customers = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.phone, u.address, u.city, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.store_id = ${storeId}
      WHERE u.role = 'customer'
      GROUP BY u.id, u.name, u.email, u.phone, u.address, u.city, u.created_at
      HAVING COUNT(o.id) > 0
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

router.get("/erp/customers/:id", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const userId = pid(req, "id");
    // Customer is only visible if they have at least one order in the current
    // store. Prevents cross-store PII leak via direct id access.
    const [orderProof] = await db.select({ id: schema.ordersTable.id }).from(schema.ordersTable)
      .where(and(eq(schema.ordersTable.userId, userId), eq(schema.ordersTable.storeId, storeId))).limit(1);
    if (!orderProof) { res.status(404).json({ error: "Customer not found" }); return; }
    const [user] = await db.select().from(schema.usersTable)
      .where(and(eq(schema.usersTable.id, userId), eq(schema.usersTable.role, "customer"))).limit(1);
    if (!user) { res.status(404).json({ error: "Customer not found" }); return; }
    const orders = await db.select().from(schema.ordersTable)
      .where(and(eq(schema.ordersTable.userId, userId), eq(schema.ordersTable.storeId, storeId)))
      .orderBy(desc(schema.ordersTable.createdAt));
    const notes = await db.select().from(schema.customerNotesTable)
      .where(and(eq(schema.customerNotesTable.userId, userId), eq(schema.customerNotesTable.storeId, storeId)));
    res.json({ ...user, orders, notes });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/customers/:id/notes", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const [note] = await db.insert(schema.customerNotesTable)
      .values({ userId: pid(req, "id"), note: req.body.note, storeId: req.currentStoreId! })
      .returning();
    res.status(201).json(note);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Staff (system users with admin/employee role) ────────────────
// Cross-store: list & manage users, plus their per-store grants.
router.get("/erp/staff", authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', s.id, 'nameEn', s.name_en, 'nameAr', s.name_ar, 'slug', s.slug))
           FROM user_stores us JOIN stores s ON s.id = us.store_id
           WHERE us.user_id = u.id),
          '[]'::json
        ) AS stores
      FROM users u
      WHERE u.role IN ('admin', 'employee')
      ORDER BY u.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/staff", authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, storeIds } = req.body || {};
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

    // Attach to stores. Admins default to ALL stores; employees must be told
    // exactly which one(s) — falling back to the first active store.
    let targetStoreIds: number[] = Array.isArray(storeIds) ? storeIds.filter((n: unknown) => Number.isInteger(n)) : [];
    if (targetStoreIds.length === 0) {
      const all = await db.select({ id: schema.storesTable.id }).from(schema.storesTable)
        .where(eq(schema.storesTable.isActive, true)).orderBy(schema.storesTable.id);
      if (wantedRole === "admin") targetStoreIds = all.map(s => s.id);
      else if (all.length) targetStoreIds = [all[0].id];
    }
    if (targetStoreIds.length) {
      await db.insert(schema.userStoresTable)
        .values(targetStoreIds.map(storeId => ({ userId: user.id, storeId })))
        .onConflictDoNothing();
    }

    res.status(201).json({
      id: user.id, name: user.name, email: user.email,
      role: user.role, phone: user.phone, created_at: user.createdAt,
      storeIds: targetStoreIds,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/erp/staff/:id/stores", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const targetId = pid(req, "id");
    const { storeIds } = req.body || {};
    if (!Array.isArray(storeIds) || storeIds.some((n: unknown) => !Number.isInteger(n))) {
      res.status(400).json({ error: "storeIds must be an array of integers" });
      return;
    }
    if (storeIds.length === 0) {
      res.status(400).json({ error: "A staff member must have access to at least one store" });
      return;
    }
    await db.delete(schema.userStoresTable).where(eq(schema.userStoresTable.userId, targetId));
    await db.insert(schema.userStoresTable)
      .values((storeIds as number[]).map(storeId => ({ userId: targetId, storeId })))
      .onConflictDoNothing();
    res.json({ success: true, userId: targetId, storeIds });
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
