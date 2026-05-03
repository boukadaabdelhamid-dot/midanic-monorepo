import { Router } from "express";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { authenticate, requireStaff, requireStore, isAdmin, type AuthRequest } from "../lib/auth";
import { broadcastToAdmins } from "../lib/ws";

const router = Router();

const pid = (req: { params: Record<string, string | string[]> }, key: string): number =>
  parseInt(req.params[key] as string);

type TransferStatus = typeof schema.stockTransferStatusEnum.enumValues[number];

// ─── helpers ───────────────────────────────────────────────────────
async function loadTransferOr404(id: number) {
  const [t] = await db.select().from(schema.stockTransfersTable)
    .where(eq(schema.stockTransfersTable.id, id)).limit(1);
  return t ?? null;
}

async function logEvent(
  transferId: number,
  status: TransferStatus,
  actorUserId: number,
  actorStoreId: number,
  notes: string | null,
) {
  await db.insert(schema.stockTransferEventsTable).values({
    transferId, status, actorUserId, actorStoreId, notes,
  });
}

function broadcastTransferChanged(t: { id: number; sourceStoreId: number; destinationStoreId: number; status: TransferStatus }) {
  broadcastToAdmins({
    type: "stock_transfer_changed",
    storeIds: [t.sourceStoreId, t.destinationStoreId],
    transferId: t.id,
    status: t.status,
    sourceStoreId: t.sourceStoreId,
    destinationStoreId: t.destinationStoreId,
  });
}

// Authorization helpers per side.
// Source actions: prepare, ship, cancel (if no shipment yet)
// Destination actions: approve, reject, receive
// Both sides may VIEW.
// NOTE: admins are NOT given a blanket bypass — they must have selected
// the relevant store via the store-switcher (currentStoreId), which is
// the same pattern used everywhere else in the ERP. This prevents an
// admin currently on store C from acting on a transfer between A and B.
function actorOnSource(req: AuthRequest, t: { sourceStoreId: number }): boolean {
  return req.currentStoreId === t.sourceStoreId;
}
function actorOnDestination(req: AuthRequest, t: { destinationStoreId: number }): boolean {
  return req.currentStoreId === t.destinationStoreId;
}
function actorInvolved(req: AuthRequest, t: { sourceStoreId: number; destinationStoreId: number }): boolean {
  return actorOnSource(req, t) || actorOnDestination(req, t);
}

// ─── LIST ──────────────────────────────────────────────────────────
router.get("/erp/transfers", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const storeId = req.currentStoreId!;
    const { direction, status } = req.query as Record<string, string>;
    const conditions = [] as Array<ReturnType<typeof eq>>;
    if (direction === "in") {
      conditions.push(eq(schema.stockTransfersTable.destinationStoreId, storeId));
    } else if (direction === "out") {
      conditions.push(eq(schema.stockTransfersTable.sourceStoreId, storeId));
    } else {
      conditions.push(or(
        eq(schema.stockTransfersTable.sourceStoreId, storeId),
        eq(schema.stockTransfersTable.destinationStoreId, storeId),
      )!);
    }
    if (status) {
      conditions.push(eq(schema.stockTransfersTable.status, status as TransferStatus));
    }
    const rows = await db.select().from(schema.stockTransfersTable)
      .where(and(...conditions))
      .orderBy(desc(schema.stockTransfersTable.createdAt))
      .limit(200);

    // Hydrate counterparty store names + item counts in batch
    const storeIds = Array.from(new Set(rows.flatMap(r => [r.sourceStoreId, r.destinationStoreId])));
    const stores = storeIds.length
      ? await db.select({ id: schema.storesTable.id, nameEn: schema.storesTable.nameEn, nameAr: schema.storesTable.nameAr })
          .from(schema.storesTable).where(inArray(schema.storesTable.id, storeIds))
      : [];
    const storeMap = new Map(stores.map(s => [s.id, s]));

    const ids = rows.map(r => r.id);
    const items = ids.length
      ? await db.select().from(schema.stockTransferItemsTable)
          .where(inArray(schema.stockTransferItemsTable.transferId, ids))
      : [];
    const counts = new Map<number, { itemCount: number; totalQty: number }>();
    for (const it of items) {
      const c = counts.get(it.transferId) ?? { itemCount: 0, totalQty: 0 };
      c.itemCount += 1;
      c.totalQty += it.quantity;
      counts.set(it.transferId, c);
    }

    res.json(rows.map(r => ({
      ...r,
      sourceStore: storeMap.get(r.sourceStoreId) ?? null,
      destinationStore: storeMap.get(r.destinationStoreId) ?? null,
      itemCount: counts.get(r.id)?.itemCount ?? 0,
      totalQuantity: counts.get(r.id)?.totalQty ?? 0,
    })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── DETAIL ────────────────────────────────────────────────────────
router.get("/erp/transfers/:id", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!actorInvolved(req, t)) {
      res.status(403).json({ error: "Forbidden", code: "STORE_ACCESS_REVOKED" });
      return;
    }

    const items = await db.select({
      id: schema.stockTransferItemsTable.id,
      transferId: schema.stockTransferItemsTable.transferId,
      sourceProductId: schema.stockTransferItemsTable.sourceProductId,
      destinationProductId: schema.stockTransferItemsTable.destinationProductId,
      quantity: schema.stockTransferItemsTable.quantity,
      matchKey: schema.stockTransferItemsTable.matchKey,
      sourceProductNameEn: schema.productsTable.nameEn,
      sourceProductNameAr: schema.productsTable.nameAr,
      sourceProductStock: schema.productsTable.stock,
    })
      .from(schema.stockTransferItemsTable)
      .leftJoin(schema.productsTable, eq(schema.productsTable.id, schema.stockTransferItemsTable.sourceProductId))
      .where(eq(schema.stockTransferItemsTable.transferId, t.id));

    const events = await db.select().from(schema.stockTransferEventsTable)
      .where(eq(schema.stockTransferEventsTable.transferId, t.id))
      .orderBy(schema.stockTransferEventsTable.createdAt);

    const stores = await db.select({ id: schema.storesTable.id, nameEn: schema.storesTable.nameEn, nameAr: schema.storesTable.nameAr })
      .from(schema.storesTable).where(inArray(schema.storesTable.id, [t.sourceStoreId, t.destinationStoreId]));
    const storeMap = new Map(stores.map(s => [s.id, s]));

    res.json({
      ...t,
      sourceStore: storeMap.get(t.sourceStoreId) ?? null,
      destinationStore: storeMap.get(t.destinationStoreId) ?? null,
      items,
      events,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CREATE ────────────────────────────────────────────────────────
// Body: {
//   destinationStoreId? (when current store = source),
//   sourceStoreId?      (when current store = destination, "pull request"),
//   items: [{ sourceProductId, quantity }], notes,
//   mode: 'request'|'send'
// }
// 'request' (default): created in 'requested', destination must approve.
//   - source-initiated: source asks destination to accept goods (push request)
//   - destination-initiated: destination asks source to send goods (pull request)
// 'send' (admin only, source-initiated only): created in 'prepared',
//   source stock decremented immediately.
router.post("/erp/transfers", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const currentStoreId = req.currentStoreId!;
    const userId = req.user!.id;
    const { destinationStoreId, sourceStoreId: sourceStoreIdRaw, items, notes, mode } = req.body || {};

    // Determine which side the current store plays
    let sourceStoreId: number;
    let destId: number;
    let initiatorSide: "source" | "destination";
    if (destinationStoreId !== undefined && sourceStoreIdRaw === undefined) {
      sourceStoreId = currentStoreId;
      destId = Number(destinationStoreId);
      initiatorSide = "source";
    } else if (sourceStoreIdRaw !== undefined && destinationStoreId === undefined) {
      sourceStoreId = Number(sourceStoreIdRaw);
      destId = currentStoreId;
      initiatorSide = "destination";
    } else {
      res.status(400).json({ error: "Provide exactly one of sourceStoreId or destinationStoreId" });
      return;
    }
    if (!Number.isInteger(sourceStoreId) || !Number.isInteger(destId) || sourceStoreId === destId) {
      res.status(400).json({ error: "Source and destination must be two different stores" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items required" });
      return;
    }

    // Validate the OTHER store exists and is active
    const otherStoreId = initiatorSide === "source" ? destId : sourceStoreId;
    const [otherStore] = await db.select({ id: schema.storesTable.id })
      .from(schema.storesTable)
      .where(and(eq(schema.storesTable.id, otherStoreId), eq(schema.storesTable.isActive, true)))
      .limit(1);
    if (!otherStore) { res.status(400).json({ error: "Counterparty store not found or inactive" }); return; }

    // Resolve products: each must belong to the SOURCE store, must have a
    // non-empty reference or barcode (used to match the destination row).
    const sourceProductIds = items.map((it: { sourceProductId: unknown }) => Number(it.sourceProductId));
    if (sourceProductIds.some((n: number) => !Number.isInteger(n))) {
      res.status(400).json({ error: "Invalid sourceProductId" }); return;
    }
    const sourceProducts = await db.select().from(schema.productsTable)
      .where(and(inArray(schema.productsTable.id, sourceProductIds), eq(schema.productsTable.storeId, sourceStoreId)));
    if (sourceProducts.length !== new Set(sourceProductIds).size) {
      res.status(400).json({ error: "One or more products do not belong to the source store" });
      return;
    }
    const sourceMap = new Map(sourceProducts.map(p => [p.id, p]));

    // Build line items + match destination products
    const preparedMode = mode === "send";
    if (preparedMode) {
      if (!isAdmin(req)) {
        res.status(403).json({ error: "Only admins can send directly without prior approval" });
        return;
      }
      if (initiatorSide !== "source") {
        res.status(400).json({ error: "Direct send requires you to be on the source store" });
        return;
      }
    }

    type LineDraft = { sourceProductId: number; destinationProductId: number; quantity: number; matchKey: string };
    const drafts: LineDraft[] = [];
    const unmatched: string[] = [];
    for (const it of items) {
      const src = sourceMap.get(Number(it.sourceProductId))!;
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for product ${src.id}` });
        return;
      }
      const matchKey = (src.reference || src.barcode || "").trim();
      if (!matchKey) {
        res.status(400).json({ error: `Product "${src.nameEn}" has no reference or barcode — cannot match across stores` });
        return;
      }
      // Destination must already have a matching product (invariant enforced upfront)
      const [destProduct] = await db.select({ id: schema.productsTable.id }).from(schema.productsTable)
        .where(and(
          eq(schema.productsTable.storeId, destId),
          or(eq(schema.productsTable.reference, matchKey), eq(schema.productsTable.barcode, matchKey))!,
        )).limit(1);
      if (!destProduct) {
        unmatched.push(`"${src.nameEn}" (${matchKey})`);
        continue;
      }
      drafts.push({
        sourceProductId: src.id,
        destinationProductId: destProduct.id,
        quantity: qty,
        matchKey,
      });
    }
    if (unmatched.length > 0) {
      res.status(400).json({
        error: `Destination store has no matching product for: ${unmatched.join(", ")}. Create them in the destination store first (matching reference or barcode).`,
        code: "DESTINATION_PRODUCTS_MISSING",
        unmatched,
      });
      return;
    }

    // If preparing immediately, ensure stock is sufficient
    if (preparedMode) {
      for (const d of drafts) {
        const src = sourceMap.get(d.sourceProductId)!;
        if (src.stock < d.quantity) {
          res.status(409).json({ error: `Insufficient stock for "${src.nameEn}" (have ${src.stock}, need ${d.quantity})` });
          return;
        }
      }
    }

    const status: TransferStatus = preparedMode ? "prepared" : "requested";
    const now = new Date();

    const created = await db.transaction(async (tx) => {
      const [transfer] = await tx.insert(schema.stockTransfersTable).values({
        sourceStoreId,
        destinationStoreId: destId,
        initiatorUserId: userId,
        initiatorSide,
        status,
        notes: notes || null,
        ...(preparedMode ? { preparedAt: now } : {}),
      }).returning();

      await tx.insert(schema.stockTransferItemsTable).values(drafts.map(d => ({
        transferId: transfer.id,
        sourceProductId: d.sourceProductId,
        destinationProductId: d.destinationProductId,
        quantity: d.quantity,
        matchKey: d.matchKey,
      })));

      await tx.insert(schema.stockTransferEventsTable).values({
        transferId: transfer.id,
        status,
        actorUserId: userId,
        actorStoreId: currentStoreId,
        notes: preparedMode
          ? "Direct send (admin)"
          : (initiatorSide === "destination" ? "Pull request from destination" : "Push request from source"),
      });

      // If pre-prepared, decrement source stock and write 'out' inventory movements
      if (preparedMode) {
        for (const d of drafts) {
          const src = sourceMap.get(d.sourceProductId)!;
          await tx.update(schema.productsTable)
            .set({ stock: src.stock - d.quantity })
            .where(eq(schema.productsTable.id, src.id));
          await tx.insert(schema.inventoryMovementsTable).values({
            storeId: sourceStoreId,
            productId: src.id,
            type: "out",
            quantity: d.quantity,
            reason: "Inter-store transfer (sent)",
            reference: `TR-${transfer.id}`,
          });
        }
      }
      return transfer;
    });

    broadcastTransferChanged(created);
    res.status(201).json(created);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── ACTIONS ───────────────────────────────────────────────────────
// Allowed transitions:
// requested → approved (dest)  | rejected (dest)  | cancelled (source)
// approved  → prepared (source) | cancelled (source)
// prepared  → in_transit (source/ship) | cancelled (source, admin only)
// in_transit → received (dest)
function ensure(req: AuthRequest, ok: boolean, res: import("express").Response, msg = "Forbidden"): boolean {
  if (!ok) { res.status(403).json({ error: msg }); return false; }
  return true;
}

router.post("/erp/transfers/:id/approve", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnDestination(req, t), res, "Only destination side can approve")) return;
    if (t.status !== "requested") { res.status(409).json({ error: `Cannot approve from status ${t.status}` }); return; }

    const [updated] = await db.update(schema.stockTransfersTable)
      .set({ status: "approved", approvedAt: new Date() })
      .where(eq(schema.stockTransfersTable.id, t.id)).returning();
    await logEvent(t.id, "approved", req.user!.id, req.currentStoreId!, req.body?.notes ?? null);
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transfers/:id/reject", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnDestination(req, t), res, "Only destination side can reject")) return;
    if (t.status !== "requested") { res.status(409).json({ error: `Cannot reject from status ${t.status}` }); return; }

    const [updated] = await db.update(schema.stockTransfersTable)
      .set({ status: "rejected", rejectedAt: new Date() })
      .where(eq(schema.stockTransfersTable.id, t.id)).returning();
    await logEvent(t.id, "rejected", req.user!.id, req.currentStoreId!, req.body?.notes ?? null);
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transfers/:id/prepare", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnSource(req, t), res, "Only source side can prepare")) return;
    if (t.status === "requested") {
      // Direct prepare from 'requested' only allowed for source admin (skip approval).
      if (!isAdmin(req)) {
        res.status(409).json({ error: `Cannot prepare from status ${t.status}` }); return;
      }
    } else if (t.status !== "approved") {
      res.status(409).json({ error: `Cannot prepare from status ${t.status}` }); return;
    }

    const items = await db.select().from(schema.stockTransferItemsTable)
      .where(eq(schema.stockTransferItemsTable.transferId, t.id));
    const productIds = items.map(it => it.sourceProductId);
    const products = await db.select().from(schema.productsTable)
      .where(inArray(schema.productsTable.id, productIds));
    const pmap = new Map(products.map(p => [p.id, p]));
    for (const it of items) {
      const p = pmap.get(it.sourceProductId);
      if (!p) { res.status(409).json({ error: "Product missing" }); return; }
      if (p.stock < it.quantity) {
        res.status(409).json({ error: `Insufficient stock for "${p.nameEn}" (have ${p.stock}, need ${it.quantity})` });
        return;
      }
    }

    const updated = await db.transaction(async (tx) => {
      for (const it of items) {
        const p = pmap.get(it.sourceProductId)!;
        await tx.update(schema.productsTable).set({ stock: p.stock - it.quantity })
          .where(eq(schema.productsTable.id, p.id));
        await tx.insert(schema.inventoryMovementsTable).values({
          storeId: t.sourceStoreId,
          productId: p.id,
          type: "out",
          quantity: it.quantity,
          reason: "Inter-store transfer (prepared)",
          reference: `TR-${t.id}`,
        });
      }
      const [u] = await tx.update(schema.stockTransfersTable)
        .set({ status: "prepared", preparedAt: new Date() })
        .where(eq(schema.stockTransfersTable.id, t.id)).returning();
      await tx.insert(schema.stockTransferEventsTable).values({
        transferId: t.id, status: "prepared", actorUserId: req.user!.id,
        actorStoreId: req.currentStoreId!, notes: req.body?.notes ?? null,
      });
      return u;
    });
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transfers/:id/ship", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnSource(req, t), res, "Only source side can ship")) return;
    if (t.status !== "prepared") { res.status(409).json({ error: `Cannot ship from status ${t.status}` }); return; }

    const [updated] = await db.update(schema.stockTransfersTable)
      .set({ status: "in_transit", shippedAt: new Date() })
      .where(eq(schema.stockTransfersTable.id, t.id)).returning();
    await logEvent(t.id, "in_transit", req.user!.id, req.currentStoreId!, req.body?.notes ?? null);
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/erp/transfers/:id/receive", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnDestination(req, t), res, "Only destination side can receive")) return;
    if (t.status !== "in_transit" && t.status !== "prepared") {
      res.status(409).json({ error: `Cannot receive from status ${t.status}` }); return;
    }

    const items = await db.select().from(schema.stockTransferItemsTable)
      .where(eq(schema.stockTransferItemsTable.transferId, t.id));

    // Resolve any unresolved destination products now (in case it was created after the transfer)
    const updated = await db.transaction(async (tx) => {
      for (const it of items) {
        let destProductId = it.destinationProductId;
        if (!destProductId) {
          const [destP] = await tx.select({ id: schema.productsTable.id }).from(schema.productsTable)
            .where(and(
              eq(schema.productsTable.storeId, t.destinationStoreId),
              or(eq(schema.productsTable.reference, it.matchKey), eq(schema.productsTable.barcode, it.matchKey))!,
            )).limit(1);
          if (!destP) {
            throw new Error(`No matching product in destination store for reference/barcode "${it.matchKey}"`);
          }
          destProductId = destP.id;
          await tx.update(schema.stockTransferItemsTable)
            .set({ destinationProductId: destProductId })
            .where(eq(schema.stockTransferItemsTable.id, it.id));
        }
        const [destP] = await tx.select().from(schema.productsTable)
          .where(eq(schema.productsTable.id, destProductId)).limit(1);
        if (!destP) throw new Error("Destination product missing");
        await tx.update(schema.productsTable).set({ stock: destP.stock + it.quantity })
          .where(eq(schema.productsTable.id, destP.id));
        await tx.insert(schema.inventoryMovementsTable).values({
          storeId: t.destinationStoreId,
          productId: destP.id,
          type: "in",
          quantity: it.quantity,
          reason: "Inter-store transfer (received)",
          reference: `TR-${t.id}`,
        });
      }
      const [u] = await tx.update(schema.stockTransfersTable)
        .set({ status: "received", receivedAt: new Date() })
        .where(eq(schema.stockTransfersTable.id, t.id)).returning();
      await tx.insert(schema.stockTransferEventsTable).values({
        transferId: t.id, status: "received", actorUserId: req.user!.id,
        actorStoreId: req.currentStoreId!, notes: req.body?.notes ?? null,
      });
      return u;
    });
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(409).json({ error: message });
  }
});

router.post("/erp/transfers/:id/cancel", authenticate, requireStaff, requireStore, async (req: AuthRequest, res) => {
  try {
    const t = await loadTransferOr404(pid(req, "id"));
    if (!t) { res.status(404).json({ error: "Transfer not found" }); return; }
    if (!ensure(req, actorOnSource(req, t), res, "Only source side can cancel")) return;
    if (t.status === "received" || t.status === "cancelled" || t.status === "rejected") {
      res.status(409).json({ error: `Cannot cancel from status ${t.status}` }); return;
    }
    if ((t.status === "prepared" || t.status === "in_transit") && !isAdmin(req)) {
      res.status(403).json({ error: "Only admin can cancel after items have been prepared/shipped" });
      return;
    }

    // If stock was already decremented (prepared/in_transit), restore it.
    const restore = t.status === "prepared" || t.status === "in_transit";
    const items = restore
      ? await db.select().from(schema.stockTransferItemsTable)
          .where(eq(schema.stockTransferItemsTable.transferId, t.id))
      : [];

    const updated = await db.transaction(async (tx) => {
      if (restore) {
        for (const it of items) {
          const [p] = await tx.select().from(schema.productsTable)
            .where(eq(schema.productsTable.id, it.sourceProductId)).limit(1);
          if (p) {
            await tx.update(schema.productsTable).set({ stock: p.stock + it.quantity })
              .where(eq(schema.productsTable.id, p.id));
            await tx.insert(schema.inventoryMovementsTable).values({
              storeId: t.sourceStoreId,
              productId: p.id,
              type: "in",
              quantity: it.quantity,
              reason: "Inter-store transfer cancelled (restock)",
              reference: `TR-${t.id}`,
            });
          }
        }
      }
      const [u] = await tx.update(schema.stockTransfersTable)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(schema.stockTransfersTable.id, t.id)).returning();
      await tx.insert(schema.stockTransferEventsTable).values({
        transferId: t.id, status: "cancelled", actorUserId: req.user!.id,
        actorStoreId: req.currentStoreId!, notes: req.body?.notes ?? null,
      });
      return u;
    });
    broadcastTransferChanged(updated);
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
