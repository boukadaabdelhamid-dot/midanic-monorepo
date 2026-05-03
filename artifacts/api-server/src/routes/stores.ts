import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireAdmin, type AuthRequest } from "../lib/auth";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number =>
  parseInt(req.params[key] as string);

// Public-ish: list active stores (used by storefront to populate a switcher)
router.get("/stores/public", async (_req, res) => {
  try {
    const stores = await db.select({
      id: schema.storesTable.id,
      nameAr: schema.storesTable.nameAr,
      nameEn: schema.storesTable.nameEn,
      slug: schema.storesTable.slug,
    }).from(schema.storesTable)
      .where(eq(schema.storesTable.isActive, true))
      .orderBy(schema.storesTable.id);
    res.json(stores);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Staff: list MY accessible stores (admin or employee).
router.get("/erp/stores/mine", authenticate, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "employee") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db.select({
      id: schema.storesTable.id,
      nameAr: schema.storesTable.nameAr,
      nameEn: schema.storesTable.nameEn,
      slug: schema.storesTable.slug,
      isActive: schema.storesTable.isActive,
    })
      .from(schema.userStoresTable)
      .innerJoin(schema.storesTable, eq(schema.userStoresTable.storeId, schema.storesTable.id))
      .where(eq(schema.userStoresTable.userId, req.user!.id))
      .orderBy(schema.storesTable.id);
    res.json(rows.filter((r) => r.isActive));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Staff: list ALL active tenant stores (safe projection). Used by features
// like inter-store transfers where any staff member must be able to pick a
// counterparty store, regardless of their personal memberships.
router.get("/erp/stores/all", authenticate, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "employee") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db.select({
      id: schema.storesTable.id,
      nameAr: schema.storesTable.nameAr,
      nameEn: schema.storesTable.nameEn,
      slug: schema.storesTable.slug,
      isActive: schema.storesTable.isActive,
    }).from(schema.storesTable)
      .where(eq(schema.storesTable.isActive, true))
      .orderBy(schema.storesTable.id);
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Admin: list all stores with item-count to drive UI delete-disable.
router.get("/erp/stores", authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(schema.storesTable).orderBy(schema.storesTable.id);
    const counts = await db.execute<{ store_id: number; total: string | number }>(sql`
      SELECT store_id, SUM(c)::int AS total FROM (
        SELECT store_id, COUNT(*)::int AS c FROM products      GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM categories    GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM orders        GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM coupons       GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM suppliers     GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM employees     GROUP BY store_id UNION ALL
        SELECT store_id, COUNT(*)::int AS c FROM transactions  GROUP BY store_id
      ) t GROUP BY store_id
    `);
    const map = new Map<number, number>();
    for (const r of counts.rows as { store_id: number; total: string | number }[]) {
      map.set(Number(r.store_id), Number(r.total));
    }
    res.json(rows.map((r) => ({ ...r, itemCount: map.get(r.id) ?? 0 })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/stores", authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { nameAr, nameEn, slug, isActive } = req.body || {};
    if (!nameAr || !nameEn || !slug) {
      res.status(400).json({ error: "nameAr, nameEn, slug required" });
      return;
    }
    const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const dup = await db.select({ id: schema.storesTable.id })
      .from(schema.storesTable).where(eq(schema.storesTable.slug, cleanSlug)).limit(1);
    if (dup.length) {
      res.status(409).json({ error: "A store with this slug already exists" });
      return;
    }
    const [store] = await db.insert(schema.storesTable).values({
      nameAr, nameEn, slug: cleanSlug,
      isActive: isActive !== false,
    }).returning();
    // Auto-grant the creator (admin) access
    await db.insert(schema.userStoresTable).values({ userId: req.user!.id, storeId: store.id }).onConflictDoNothing();
    res.status(201).json(store);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/erp/stores/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = pid(req, "id");
    const { nameAr, nameEn, isActive } = req.body || {};
    const update: Record<string, unknown> = {};
    if (nameAr !== undefined) update["nameAr"] = nameAr;
    if (nameEn !== undefined) update["nameEn"] = nameEn;
    if (isActive !== undefined) update["isActive"] = !!isActive;
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    const [store] = await db.update(schema.storesTable).set(update)
      .where(eq(schema.storesTable.id, id)).returning();
    if (!store) { res.status(404).json({ error: "Not found" }); return; }
    res.json(store);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/erp/stores/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = pid(req, "id");
    // Refuse if the store has any tenant rows.
    const counts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM products WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM categories WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM orders WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM cart_items WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM coupons WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM suppliers WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM purchase_orders WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM inventory_movements WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM transactions WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM employees WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM attendance WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM leaves WHERE store_id = ${id}) +
        (SELECT COUNT(*) FROM customer_notes WHERE store_id = ${id}) AS total
    `);
    const total = Number((counts.rows[0] as { total: string | number }).total);
    if (total > 0) {
      res.status(409).json({ error: "Cannot delete store: it still contains data. Reassign or delete that data first." });
      return;
    }
    await db.delete(schema.userStoresTable).where(eq(schema.userStoresTable.storeId, id));
    await db.delete(schema.storesTable).where(eq(schema.storesTable.id, id));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// User-store grants
router.get("/erp/stores/:id/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const storeId = pid(req, "id");
    const rows = await db.select({
      userId: schema.userStoresTable.userId,
      name: schema.usersTable.name,
      email: schema.usersTable.email,
      role: schema.usersTable.role,
    })
      .from(schema.userStoresTable)
      .innerJoin(schema.usersTable, eq(schema.userStoresTable.userId, schema.usersTable.id))
      .where(eq(schema.userStoresTable.storeId, storeId));
    res.json(rows);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
