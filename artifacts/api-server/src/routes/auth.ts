import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { signToken, authenticate, type AuthRequest } from "../lib/auth";
import { listUserStores } from "../lib/store-context";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, preferredLang } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, password required" });
      return;
    }
    const existing = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(schema.usersTable).values({
      name, email, passwordHash,
      preferredLang: preferredLang || "ar",
    }).returning();
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, stores: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, email)).limit(1);
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

    const allStores = (user.role === "admin" || user.role === "employee")
      ? await listUserStores(user.id)
      : [];
    // Only allow active stores into the picker / auto-select.
    const stores = allStores.filter((s) => s.isActive);

    // Auto-select if exactly one active store; otherwise leave unset.
    const currentStoreId = stores.length === 1 ? stores[0].id : null;
    const token = signToken({ id: user.id, email: user.email, role: user.role, currentStoreId });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, preferredLang: user.preferredLang },
      stores,
      currentStoreId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(schema.usersTable).where(eq(schema.usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const stores = ((user.role === "admin" || user.role === "employee")
      ? await listUserStores(user.id)
      : []).filter((s) => s.isActive);
    // Drop a stale currentStoreId if it points to a now-inactive / unlinked store.
    const tokenStoreId = req.user!.currentStoreId ?? null;
    const validCurrent = tokenStoreId != null && stores.some((s) => s.id === tokenStoreId)
      ? tokenStoreId : null;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLang: user.preferredLang,
      stores,
      currentStoreId: validCurrent,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/select-store", authenticate, async (req: AuthRequest, res) => {
  try {
    // Only admins may switch stores. Employees are pinned to their single
    // assigned store (enforced server-side via the employee=single-store
    // invariant) and customers must not consume ERP store slots.
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Only admins may switch stores" });
      return;
    }
    const { storeId } = req.body || {};
    if (!Number.isInteger(storeId)) {
      res.status(400).json({ error: "storeId required" });
      return;
    }
    const [link] = await db.select().from(schema.userStoresTable)
      .where(and(
        eq(schema.userStoresTable.userId, req.user!.id),
        eq(schema.userStoresTable.storeId, storeId),
      ))
      .limit(1);
    if (!link) {
      res.status(403).json({ error: "You do not have access to this store" });
      return;
    }
    const [store] = await db.select().from(schema.storesTable)
      .where(and(eq(schema.storesTable.id, storeId), eq(schema.storesTable.isActive, true)))
      .limit(1);
    if (!store) {
      res.status(404).json({ error: "Store not found or inactive" });
      return;
    }
    const token = signToken({
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      currentStoreId: store.id,
    });
    res.json({ token, currentStoreId: store.id, store });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
