import { Router } from "express";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireStaff, requireStore, requireAdmin, isAdmin, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number =>
  parseInt(req.params[key] as string);

type CaisseTransferStatus = typeof schema.caisseTransferStatusEnum.enumValues[number];

// ─── helpers ───────────────────────────────────────────────────────
function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function userHasStoreAccess(req: AuthRequest, storeId: number): Promise<boolean> {
  if (!req.user) return false;
  const [link] = await db.select({ storeId: schema.userStoresTable.storeId })
    .from(schema.userStoresTable)
    .where(and(
      eq(schema.userStoresTable.userId, req.user.id),
      eq(schema.userStoresTable.storeId, storeId),
    ))
    .limit(1);
  return !!link;
}

async function adminHasStoreAccess(req: AuthRequest, storeId: number): Promise<boolean> {
  if (!isAdmin(req)) return false;
  return userHasStoreAccess(req, storeId);
}

/**
 * Returns (creating if needed) the caisse for the given (storeId, ownerUserId).
 * If ownerUserId is null, returns/creates the store's main caisse.
 * Idempotent under concurrent calls thanks to partial unique indexes.
 */
export async function ensureCaisse(
  storeId: number,
  ownerUserId: number | null,
  txArg?: typeof db,
): Promise<typeof schema.caissesTable.$inferSelect> {
  const tx = txArg ?? db;
  const kind: "main" | "staff" = ownerUserId === null ? "main" : "staff";
  const where = ownerUserId === null
    ? and(eq(schema.caissesTable.storeId, storeId), eq(schema.caissesTable.kind, "main"))
    : and(eq(schema.caissesTable.storeId, storeId), eq(schema.caissesTable.ownerUserId, ownerUserId));
  const [existing] = await tx.select().from(schema.caissesTable).where(where!).limit(1);
  if (existing) return existing;
  try {
    const [created] = await tx.insert(schema.caissesTable).values({
      storeId, ownerUserId: ownerUserId ?? null, kind,
    }).returning();
    return created;
  } catch {
    // Race: another concurrent insert won — re-fetch
    const [c2] = await tx.select().from(schema.caissesTable).where(where!).limit(1);
    if (!c2) throw new Error("Failed to ensure caisse");
    return c2;
  }
}

function broadcastCaisseChanged(storeId: number, caisseIds: number[]) {
  broadcastToAdmins({ type: "caisse_changed", storeId, caisseIds });
}
function broadcastCaisseTransferChanged(storeId: number, transferId: number, status: CaisseTransferStatus) {
  broadcastToAdmins({ type: "caisse_transfer_changed", storeId, transferId, status });
}

async function loadCaisseOr404(id: number) {
  const [c] = await db.select().from(schema.caissesTable).where(eq(schema.caissesTable.id, id)).limit(1);
  return c ?? null;
}

// Authorization: a user can view/act on a caisse if they have ACTIVE
// membership in the caisse's store AND either own it or are an admin.
// Owning a caisse alone is not enough — if the staff was removed from the
// store, they lose access even if a stale caisse row still references them.
async function canSeeCaisse(req: AuthRequest, c: { storeId: number; ownerUserId: number | null }): Promise<boolean> {
  if (!req.user) return false;
  if (!(await userHasStoreAccess(req, c.storeId))) return false;
  if (isAdmin(req)) return true;
  return c.ownerUserId !== null && c.ownerUserId === req.user.id;
}

// All caisse/transfer endpoints additionally enforce that the resource's
// storeId matches the JWT's currentStoreId. This prevents using one store's
// JWT to act on another store's caisses.
function isInCurrentStore(req: AuthRequest, storeId: number): boolean {
  return req.currentStoreId === storeId;
}

// ─── LIST in current store ─────────────────────────────────────────
// Staff: returns just their own caisse + the main caisse (read-only summary).
// Admin: returns all caisses in current store (main + every staff caisse).
router.get("/erp/caisses", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const userId = req.user!.id;
    // Always ensure my own + main exist for the current store
    await ensureCaisse(storeId, null);
    await ensureCaisse(storeId, userId);

    let rows: Array<typeof schema.caissesTable.$inferSelect>;
    if (isAdmin(req)) {
      rows = await db.select().from(schema.caissesTable)
        .where(eq(schema.caissesTable.storeId, storeId))
        .orderBy(desc(schema.caissesTable.kind), schema.caissesTable.id);
    } else {
      rows = await db.select().from(schema.caissesTable)
        .where(and(
          eq(schema.caissesTable.storeId, storeId),
          or(
            eq(schema.caissesTable.kind, "main"),
            eq(schema.caissesTable.ownerUserId, userId),
          )!,
        ));
    }

    const userIds = Array.from(new Set(rows.map(r => r.ownerUserId).filter((x): x is number => !!x)));
    const users = userIds.length
      ? await db.select({ id: schema.usersTable.id, name: schema.usersTable.name, email: schema.usersTable.email, role: schema.usersTable.role })
          .from(schema.usersTable).where(inArray(schema.usersTable.id, userIds))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json(rows.map(r => ({
      ...r,
      owner: r.ownerUserId ? userMap.get(r.ownerUserId) ?? null : null,
    })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── GET caisse detail with movements ──────────────────────────────
router.get("/erp/caisses/:id", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const c = await loadCaisseOr404(pid(req, "id"));
    if (!c) { res.status(404).json({ error: "Caisse not found" }); return; }
    if (!isInCurrentStore(req, c.storeId) || !(await canSeeCaisse(req, c))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const movements = await db.select().from(schema.caisseMovementsTable)
      .where(eq(schema.caisseMovementsTable.caisseId, c.id))
      .orderBy(desc(schema.caisseMovementsTable.createdAt))
      .limit(200);

    const actorIds = Array.from(new Set(movements.map(m => m.actorUserId).filter((x): x is number => !!x)));
    const counterIds = Array.from(new Set(movements.map(m => m.counterpartyCaisseId).filter((x): x is number => !!x)));
    const [actors, counters] = await Promise.all([
      actorIds.length
        ? db.select({ id: schema.usersTable.id, name: schema.usersTable.name, email: schema.usersTable.email })
            .from(schema.usersTable).where(inArray(schema.usersTable.id, actorIds))
        : Promise.resolve([]),
      counterIds.length
        ? db.select().from(schema.caissesTable).where(inArray(schema.caissesTable.id, counterIds))
        : Promise.resolve([]),
    ]);
    const actorOwnerIds = Array.from(new Set(counters.map(x => x.ownerUserId).filter((x): x is number => !!x)));
    const counterOwners = actorOwnerIds.length
      ? await db.select({ id: schema.usersTable.id, name: schema.usersTable.name })
          .from(schema.usersTable).where(inArray(schema.usersTable.id, actorOwnerIds))
      : [];
    const counterOwnerMap = new Map(counterOwners.map(u => [u.id, u]));
    const actorMap = new Map(actors.map(u => [u.id, u]));
    const counterMap = new Map(counters.map(x => [x.id, {
      id: x.id, kind: x.kind, ownerUserId: x.ownerUserId,
      owner: x.ownerUserId ? counterOwnerMap.get(x.ownerUserId) ?? null : null,
    }]));

    let owner: { id: number; name: string | null; email: string } | null = null;
    if (c.ownerUserId) {
      const [u] = await db.select({ id: schema.usersTable.id, name: schema.usersTable.name, email: schema.usersTable.email })
        .from(schema.usersTable).where(eq(schema.usersTable.id, c.ownerUserId)).limit(1);
      owner = u ?? null;
    }

    res.json({
      ...c,
      owner,
      movements: movements.map(m => ({
        ...m,
        actorUser: actorMap.get(m.actorUserId) ?? null,
        counterparty: m.counterpartyCaisseId ? counterMap.get(m.counterpartyCaisseId) ?? null : null,
      })),
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── List caisse transfers (inbox / outbox / all) ──────────────────
router.get("/erp/caisse-transfers", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const userId = req.user!.id;
    const { box, status } = req.query as Record<string, string | undefined>;
    const myCaisse = await ensureCaisse(storeId, userId);

    const conditions = [eq(schema.caisseTransfersTable.storeId, storeId)];
    if (!isAdmin(req)) {
      conditions.push(or(
        eq(schema.caisseTransfersTable.senderCaisseId, myCaisse.id),
        eq(schema.caisseTransfersTable.recipientCaisseId, myCaisse.id),
      )!);
    }
    if (box === "inbox") conditions.push(eq(schema.caisseTransfersTable.recipientCaisseId, myCaisse.id));
    else if (box === "outbox") conditions.push(eq(schema.caisseTransfersTable.senderCaisseId, myCaisse.id));
    if (status) conditions.push(eq(schema.caisseTransfersTable.status, status as CaisseTransferStatus));

    const rows = await db.select().from(schema.caisseTransfersTable)
      .where(and(...conditions))
      .orderBy(desc(schema.caisseTransfersTable.createdAt))
      .limit(200);

    const caisseIds = Array.from(new Set(rows.flatMap(r => [r.senderCaisseId, r.recipientCaisseId])));
    const caisses = caisseIds.length
      ? await db.select().from(schema.caissesTable).where(inArray(schema.caissesTable.id, caisseIds))
      : [];
    const ownerIds = Array.from(new Set(caisses.map(c => c.ownerUserId).filter((x): x is number => !!x)));
    const userIdsAll = Array.from(new Set([
      ...rows.map(r => r.requestedByUserId),
      ...rows.map(r => r.decidedByUserId).filter((x): x is number => !!x),
      ...ownerIds,
    ]));
    const users = userIdsAll.length
      ? await db.select({ id: schema.usersTable.id, name: schema.usersTable.name, email: schema.usersTable.email })
          .from(schema.usersTable).where(inArray(schema.usersTable.id, userIdsAll))
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));
    const caisseMap = new Map(caisses.map(c => [c.id, {
      id: c.id, kind: c.kind, ownerUserId: c.ownerUserId,
      owner: c.ownerUserId ? userMap.get(c.ownerUserId) ?? null : null,
    }]));

    res.json(rows.map(r => ({
      ...r,
      senderCaisse: caisseMap.get(r.senderCaisseId) ?? null,
      recipientCaisse: caisseMap.get(r.recipientCaisseId) ?? null,
      requestedByUser: userMap.get(r.requestedByUserId) ?? null,
      decidedByUser: r.decidedByUserId ? userMap.get(r.decidedByUserId) ?? null : null,
    })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Initiate staff-to-staff transfer ──────────────────────────────
// Body: { recipientUserId, amount, notes? }
// Sender is always the current user. Funds are HELD: debited from sender
// immediately and parked in the transfer row until accept/reject/cancel.
router.post("/erp/caisse-transfers", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const userId = req.user!.id;
    const { recipientUserId, amount: amountRaw, notes } = req.body || {};
    const recipient = Number(recipientUserId);
    const amount = parseAmount(amountRaw);
    if (!Number.isInteger(recipient) || recipient === userId) {
      res.status(400).json({ error: "Invalid recipient" }); return;
    }
    if (amount === null || amount <= 0) {
      res.status(400).json({ error: "Amount must be > 0" }); return;
    }

    // Recipient must have access to current store (sanity)
    const [recipLink] = await db.select({ uid: schema.userStoresTable.userId })
      .from(schema.userStoresTable)
      .where(and(eq(schema.userStoresTable.userId, recipient), eq(schema.userStoresTable.storeId, storeId)))
      .limit(1);
    if (!recipLink) { res.status(400).json({ error: "Recipient does not belong to this store" }); return; }

    const senderCaisse = await ensureCaisse(storeId, userId);
    const recipientCaisse = await ensureCaisse(storeId, recipient);
    const amountStr = amount.toFixed(2);

    const created = await db.transaction(async (tx) => {
      // Atomic conditional debit: only succeeds if balance >= amount.
      const upd = await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} - ${amountStr}` })
        .where(and(
          eq(schema.caissesTable.id, senderCaisse.id),
          sql`${schema.caissesTable.balance} >= ${amountStr}`,
        ))
        .returning();
      if (upd.length === 0) {
        throw Object.assign(new Error("Insufficient funds in your caisse"), { http: 409 });
      }
      const [t] = await tx.insert(schema.caisseTransfersTable).values({
        storeId,
        senderCaisseId: senderCaisse.id,
        recipientCaisseId: recipientCaisse.id,
        amount: amountStr,
        status: "pending",
        notes: typeof notes === "string" ? notes : null,
        requestedByUserId: userId,
      }).returning();
      await tx.insert(schema.caisseMovementsTable).values({
        caisseId: senderCaisse.id,
        type: "debit",
        amount: amountStr,
        reason: "transfer_hold",
        counterpartyCaisseId: recipientCaisse.id,
        caisseTransferId: t.id,
        actorUserId: userId,
        notes: typeof notes === "string" ? notes : null,
      });
      return t;
    });

    broadcastCaisseChanged(storeId, [senderCaisse.id]);
    broadcastCaisseTransferChanged(storeId, created.id, "pending");
    res.status(201).json(created);
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Accept ────────────────────────────────────────────────────────
router.post("/erp/caisse-transfers/:id/accept", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const id = pid(req, "id");
    const userId = req.user!.id;
    const [t] = await db.select().from(schema.caisseTransfersTable)
      .where(eq(schema.caisseTransfersTable.id, id)).limit(1);
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!isInCurrentStore(req, t.storeId) || !(await userHasStoreAccess(req, t.storeId))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const [recipientCaisse] = await db.select().from(schema.caissesTable)
      .where(eq(schema.caissesTable.id, t.recipientCaisseId)).limit(1);
    if (!recipientCaisse || recipientCaisse.ownerUserId !== userId) {
      res.status(403).json({ error: "Only the recipient can accept" }); return;
    }
    if (t.status !== "pending") {
      res.status(409).json({ error: `Cannot accept from status ${t.status}` }); return;
    }
    await db.transaction(async (tx) => {
      const [u] = await tx.update(schema.caisseTransfersTable)
        .set({ status: "accepted", decidedByUserId: userId, decidedAt: new Date() })
        .where(and(eq(schema.caisseTransfersTable.id, t.id), eq(schema.caisseTransfersTable.status, "pending")))
        .returning();
      if (!u) throw Object.assign(new Error("Status changed by another request"), { http: 409 });

      await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} + ${t.amount}` })
        .where(eq(schema.caissesTable.id, t.recipientCaisseId));

      // Movements: log a transfer_out on sender (no balance change — it was
      // already held) and a transfer_in on recipient. Net effect across both
      // sides matches the held amount.
      await tx.insert(schema.caisseMovementsTable).values([
        {
          caisseId: t.senderCaisseId, type: "debit", amount: "0.00",
          reason: "transfer_out", counterpartyCaisseId: t.recipientCaisseId,
          caisseTransferId: t.id, actorUserId: userId,
          notes: `Accepted by recipient (held ${t.amount} released)`,
        },
        {
          caisseId: t.recipientCaisseId, type: "credit", amount: t.amount,
          reason: "transfer_in", counterpartyCaisseId: t.senderCaisseId,
          caisseTransferId: t.id, actorUserId: userId, notes: null,
        },
      ]);
    });
    broadcastCaisseChanged(t.storeId, [t.senderCaisseId, t.recipientCaisseId]);
    broadcastCaisseTransferChanged(t.storeId, t.id, "accepted");
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Reject (recipient) ────────────────────────────────────────────
router.post("/erp/caisse-transfers/:id/reject", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const id = pid(req, "id");
    const userId = req.user!.id;
    const [t] = await db.select().from(schema.caisseTransfersTable)
      .where(eq(schema.caisseTransfersTable.id, id)).limit(1);
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!isInCurrentStore(req, t.storeId) || !(await userHasStoreAccess(req, t.storeId))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const [recipientCaisse] = await db.select().from(schema.caissesTable)
      .where(eq(schema.caissesTable.id, t.recipientCaisseId)).limit(1);
    if (!recipientCaisse || recipientCaisse.ownerUserId !== userId) {
      res.status(403).json({ error: "Only the recipient can reject" }); return;
    }
    if (t.status !== "pending") {
      res.status(409).json({ error: `Cannot reject from status ${t.status}` }); return;
    }
    await db.transaction(async (tx) => {
      const [u] = await tx.update(schema.caisseTransfersTable)
        .set({ status: "rejected", decidedByUserId: userId, decidedAt: new Date() })
        .where(and(eq(schema.caisseTransfersTable.id, t.id), eq(schema.caisseTransfersTable.status, "pending")))
        .returning();
      if (!u) throw Object.assign(new Error("Status changed by another request"), { http: 409 });
      await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} + ${t.amount}` })
        .where(eq(schema.caissesTable.id, t.senderCaisseId));
      await tx.insert(schema.caisseMovementsTable).values({
        caisseId: t.senderCaisseId, type: "credit", amount: t.amount,
        reason: "transfer_refund", counterpartyCaisseId: t.recipientCaisseId,
        caisseTransferId: t.id, actorUserId: userId,
        notes: "Rejected by recipient",
      });
    });
    broadcastCaisseChanged(t.storeId, [t.senderCaisseId, t.recipientCaisseId]);
    broadcastCaisseTransferChanged(t.storeId, t.id, "rejected");
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Cancel (sender, only while still pending) ─────────────────────
router.post("/erp/caisse-transfers/:id/cancel", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const id = pid(req, "id");
    const userId = req.user!.id;
    const [t] = await db.select().from(schema.caisseTransfersTable)
      .where(eq(schema.caisseTransfersTable.id, id)).limit(1);
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!isInCurrentStore(req, t.storeId) || !(await userHasStoreAccess(req, t.storeId))) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const [senderCaisse] = await db.select().from(schema.caissesTable)
      .where(eq(schema.caissesTable.id, t.senderCaisseId)).limit(1);
    if (!senderCaisse || senderCaisse.ownerUserId !== userId) {
      res.status(403).json({ error: "Only the sender can cancel" }); return;
    }
    if (t.status !== "pending") {
      res.status(409).json({ error: `Cannot cancel from status ${t.status}` }); return;
    }
    await db.transaction(async (tx) => {
      const [u] = await tx.update(schema.caisseTransfersTable)
        .set({ status: "cancelled", decidedByUserId: userId, decidedAt: new Date() })
        .where(and(eq(schema.caisseTransfersTable.id, t.id), eq(schema.caisseTransfersTable.status, "pending")))
        .returning();
      if (!u) throw Object.assign(new Error("Status changed by another request"), { http: 409 });
      await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} + ${t.amount}` })
        .where(eq(schema.caissesTable.id, t.senderCaisseId));
      await tx.insert(schema.caisseMovementsTable).values({
        caisseId: t.senderCaisseId, type: "credit", amount: t.amount,
        reason: "transfer_refund", counterpartyCaisseId: t.recipientCaisseId,
        caisseTransferId: t.id, actorUserId: userId,
        notes: "Cancelled by sender",
      });
    });
    broadcastCaisseChanged(t.storeId, [t.senderCaisseId]);
    broadcastCaisseTransferChanged(t.storeId, t.id, "cancelled");
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: deposit (caisse → main) ────────────────────────────────
// Body: { caisseId, amount, notes? } — moves money from a staff caisse
// into the store's main caisse. Admin only; caisse must be in a store
// the admin has membership in.
router.post("/erp/caisses/admin/deposit", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const caisseIdRaw = Number(req.body?.caisseId);
    const amount = parseAmount(req.body?.amount);
    if (!Number.isInteger(caisseIdRaw)) { res.status(400).json({ error: "Invalid caisseId" }); return; }
    if (amount === null || amount <= 0) { res.status(400).json({ error: "Amount must be > 0" }); return; }

    const c = await loadCaisseOr404(caisseIdRaw);
    if (!c) { res.status(404).json({ error: "Caisse not found" }); return; }
    if (c.kind !== "staff") { res.status(400).json({ error: "Source must be a staff caisse" }); return; }
    if (!isInCurrentStore(req, c.storeId) || !(await adminHasStoreAccess(req, c.storeId))) {
      res.status(403).json({ error: "No access to this caisse's store" }); return;
    }
    const main = await ensureCaisse(c.storeId, null);
    const amountStr = amount.toFixed(2);
    const notes = typeof req.body?.notes === "string" ? req.body.notes : null;

    await db.transaction(async (tx) => {
      const upd = await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} - ${amountStr}` })
        .where(and(
          eq(schema.caissesTable.id, c.id),
          sql`${schema.caissesTable.balance} >= ${amountStr}`,
        ))
        .returning();
      if (upd.length === 0) throw Object.assign(new Error("Insufficient funds in source caisse"), { http: 409 });
      await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} + ${amountStr}` })
        .where(eq(schema.caissesTable.id, main.id));
      await tx.insert(schema.caisseMovementsTable).values([
        {
          caisseId: c.id, type: "debit", amount: amountStr,
          reason: "admin_deposit", counterpartyCaisseId: main.id,
          actorUserId: userId, notes,
        },
        {
          caisseId: main.id, type: "credit", amount: amountStr,
          reason: "admin_deposit", counterpartyCaisseId: c.id,
          actorUserId: userId, notes,
        },
      ]);
    });
    broadcastCaisseChanged(c.storeId, [c.id, main.id]);
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: withdraw (main → caisse) ───────────────────────────────
router.post("/erp/caisses/admin/withdraw", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const caisseIdRaw = Number(req.body?.caisseId);
    const amount = parseAmount(req.body?.amount);
    if (!Number.isInteger(caisseIdRaw)) { res.status(400).json({ error: "Invalid caisseId" }); return; }
    if (amount === null || amount <= 0) { res.status(400).json({ error: "Amount must be > 0" }); return; }

    const c = await loadCaisseOr404(caisseIdRaw);
    if (!c) { res.status(404).json({ error: "Caisse not found" }); return; }
    if (c.kind !== "staff") { res.status(400).json({ error: "Destination must be a staff caisse" }); return; }
    if (!isInCurrentStore(req, c.storeId) || !(await adminHasStoreAccess(req, c.storeId))) {
      res.status(403).json({ error: "No access to this caisse's store" }); return;
    }
    const main = await ensureCaisse(c.storeId, null);
    const amountStr = amount.toFixed(2);
    const notes = typeof req.body?.notes === "string" ? req.body.notes : null;

    await db.transaction(async (tx) => {
      const upd = await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} - ${amountStr}` })
        .where(and(
          eq(schema.caissesTable.id, main.id),
          sql`${schema.caissesTable.balance} >= ${amountStr}`,
        ))
        .returning();
      if (upd.length === 0) throw Object.assign(new Error("Insufficient funds in main caisse"), { http: 409 });
      await tx.update(schema.caissesTable)
        .set({ balance: sql`${schema.caissesTable.balance} + ${amountStr}` })
        .where(eq(schema.caissesTable.id, c.id));
      await tx.insert(schema.caisseMovementsTable).values([
        {
          caisseId: main.id, type: "debit", amount: amountStr,
          reason: "admin_withdraw", counterpartyCaisseId: c.id,
          actorUserId: userId, notes,
        },
        {
          caisseId: c.id, type: "credit", amount: amountStr,
          reason: "admin_withdraw", counterpartyCaisseId: main.id,
          actorUserId: userId, notes,
        },
      ]);
    });
    broadcastCaisseChanged(c.storeId, [c.id, main.id]);
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: adjustment (signed delta with mandatory reason) ────────
router.post("/erp/caisses/admin/adjust", authenticate, requireAdmin, requireStore, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const caisseIdRaw = Number(req.body?.caisseId);
    const delta = parseAmount(req.body?.delta);
    const reason = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
    if (!Number.isInteger(caisseIdRaw)) { res.status(400).json({ error: "Invalid caisseId" }); return; }
    if (delta === null || delta === 0) { res.status(400).json({ error: "Delta must be non-zero" }); return; }
    if (!reason) { res.status(400).json({ error: "Notes/reason required for adjustment" }); return; }

    const c = await loadCaisseOr404(caisseIdRaw);
    if (!c) { res.status(404).json({ error: "Caisse not found" }); return; }
    if (!isInCurrentStore(req, c.storeId) || !(await adminHasStoreAccess(req, c.storeId))) {
      res.status(403).json({ error: "No access to this caisse's store" }); return;
    }
    const absStr = Math.abs(delta).toFixed(2);
    const isCredit = delta > 0;

    await db.transaction(async (tx) => {
      if (isCredit) {
        await tx.update(schema.caissesTable)
          .set({ balance: sql`${schema.caissesTable.balance} + ${absStr}` })
          .where(eq(schema.caissesTable.id, c.id));
      } else {
        const upd = await tx.update(schema.caissesTable)
          .set({ balance: sql`${schema.caissesTable.balance} - ${absStr}` })
          .where(and(
            eq(schema.caissesTable.id, c.id),
            sql`${schema.caissesTable.balance} >= ${absStr}`,
          ))
          .returning();
        if (upd.length === 0) throw Object.assign(new Error("Insufficient funds for negative adjustment"), { http: 409 });
      }
      await tx.insert(schema.caisseMovementsTable).values({
        caisseId: c.id,
        type: isCredit ? "credit" : "debit",
        amount: absStr,
        reason: "adjustment",
        actorUserId: userId,
        notes: reason,
      });
    });
    broadcastCaisseChanged(c.storeId, [c.id]);
    res.json({ ok: true });
  } catch (err) {
    const e = err as { http?: number; message?: string };
    if (e.http === 409) { res.status(409).json({ error: e.message }); return; }
    req.log.error(err); res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Staff-accessible recipient list (current store) ───────────────
// Lists candidate recipients (other staff/admins) for a transfer in the
// current store. Accessible to all staff so non-admin employees can pick
// a colleague — does NOT expose the full /erp/staff admin endpoint.
router.get("/erp/caisse-transfer-recipients", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const userId = req.user!.id;
    const rows = await db.select({
      id: schema.usersTable.id,
      name: schema.usersTable.name,
      email: schema.usersTable.email,
      role: schema.usersTable.role,
    })
      .from(schema.usersTable)
      .innerJoin(schema.userStoresTable, eq(schema.userStoresTable.userId, schema.usersTable.id))
      .where(and(
        eq(schema.userStoresTable.storeId, storeId),
        inArray(schema.usersTable.role, ["admin", "employee"]),
      ))
      .orderBy(schema.usersTable.name);
    res.json(rows.filter(r => r.id !== userId));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
