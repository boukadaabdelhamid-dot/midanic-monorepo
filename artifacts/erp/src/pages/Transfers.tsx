import React, { useMemo, useState } from "react";
import {
  useGetErpTransfers,
  useGetErpTransfer,
  useCreateErpTransfer,
  useApproveErpTransfer,
  useRejectErpTransfer,
  usePrepareErpTransfer,
  useShipErpTransfer,
  useReceiveErpTransfer,
  useCancelErpTransfer,
  useGetProducts,
  useGetErpStoresAll,
  getGetErpTransfersQueryKey,
  getGetErpTransferQueryKey,
  type StockTransferSummary,
  type StockTransferDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { useStoreContext } from "@/hooks/use-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Plus, Send, CheckCircle2, XCircle, PackageCheck, Truck, Inbox, Ban, Trash2, ScanLine, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, { en: string; ar: string; cls: string }> = {
  requested:  { en: "Requested",   ar: "طلب",          cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  approved:   { en: "Approved",    ar: "مقبول",         cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  rejected:   { en: "Rejected",    ar: "مرفوض",         cls: "bg-red-100 text-red-700 border border-red-200" },
  prepared:   { en: "Prepared",    ar: "محضّر",         cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  in_transit: { en: "In Transit",  ar: "في الطريق",     cls: "bg-purple-100 text-purple-700 border border-purple-200" },
  received:   { en: "Received",    ar: "مستلم",         cls: "bg-teal-100 text-teal-700 border border-teal-200" },
  cancelled:  { en: "Cancelled",   ar: "ملغى",          cls: "bg-gray-100 text-gray-600 border border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { en: status, ar: status, cls: "bg-gray-100" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>
      {s.en} / {s.ar}
    </span>
  );
}

type LineDraft = { sourceProductId: string; quantity: string };

type ProductLite = {
  id: number;
  nameEn: string;
  nameAr: string;
  reference?: string | null;
  barcode?: string | null;
  stock: number;
};

function productKey(p: ProductLite): string | null {
  return p.reference || p.barcode || null;
}

function findByCode(products: ProductLite[], raw: string): ProductLite | undefined {
  const t = raw.trim().toLowerCase();
  if (!t) return undefined;
  return products.find(
    (p) =>
      (p.barcode ?? "").toLowerCase() === t ||
      (p.reference ?? "").toLowerCase() === t,
  );
}

export default function Transfers() {
  const qc = useQueryClient();
  const { user, isAdmin } = useMe();
  const { currentStoreId } = useStoreContext();
  const [direction, setDirection] = useState<"in" | "out" | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryParams = statusFilter
    ? ({ direction, status: statusFilter } as Parameters<typeof useGetErpTransfers>[0])
    : ({ direction } as Parameters<typeof useGetErpTransfers>[0]);
  const { data: transfers, isLoading } = useGetErpTransfers(queryParams);
  const [openCreate, setOpenCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  // Counterparty options: all active tenant stores except the current one.
  // Single-store employees still need to pick any other store as the
  // counterparty, so we use the staff-accessible /erp/stores/all endpoint
  // (typed client) instead of /erp/stores (admin-only) or user.stores
  // (employee-restricted).
  const { data: allStores } = useGetErpStoresAll();
  const otherStores = ((allStores ?? []) as Array<{ id: number; nameEn: string; nameAr: string; isActive?: boolean }>)
    .filter((s) => s.id !== currentStoreId && s.isActive !== false);
  void user;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Transferts / التحويلات
          </h1>
          <p className="text-sm text-muted-foreground">
            Inter-store stock transfers / تحويلات المخزون بين المتاجر
          </p>
        </div>
        <Button
          onClick={() => setOpenCreate(true)}
          disabled={otherStores.length === 0}
          data-testid="button-new-transfer"
        >
          <Plus className="h-4 w-4 mr-2" /> New Transfer / تحويل جديد
        </Button>
      </div>

      <Tabs value={direction} onValueChange={(v) => setDirection(v as "in" | "out" | "all")}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All / الكل</TabsTrigger>
            <TabsTrigger value="in" data-testid="tab-in">
              <Inbox className="h-3.5 w-3.5 mr-1" /> Incoming / واردة
            </TabsTrigger>
            <TabsTrigger value="out" data-testid="tab-out">
              <Send className="h-3.5 w-3.5 mr-1" /> Outgoing / صادرة
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status / الحالة</Label>
            <Select value={statusFilter || "__all"} onValueChange={(v) => setStatusFilter(v === "__all" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm w-44" data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All / الكل</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.en} / {v.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TabsContent value={direction}>
          <Card className="border shadow-sm mt-3">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>From / من</TableHead>
                        <TableHead>To / إلى</TableHead>
                        <TableHead>Items / أصناف</TableHead>
                        <TableHead>Qty / كمية</TableHead>
                        <TableHead>Status / الحالة</TableHead>
                        <TableHead>By / بواسطة</TableHead>
                        <TableHead>Date / التاريخ</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transfers ?? []).map((t: StockTransferSummary) => {
                        const isOutgoing = t.sourceStoreId === currentStoreId;
                        return (
                          <TableRow key={t.id} data-testid={`row-transfer-${t.id}`}>
                            <TableCell className="font-mono text-xs">#{t.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {!isOutgoing && <Inbox className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-sm">{t.sourceStore?.nameEn ?? `#${t.sourceStoreId}`}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {isOutgoing && <Send className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-sm">{t.destinationStore?.nameEn ?? `#${t.destinationStoreId}`}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{t.itemCount ?? 0}</TableCell>
                            <TableCell className="text-sm font-semibold tabular-nums">{t.totalQuantity ?? 0}</TableCell>
                            <TableCell><StatusBadge status={t.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground" data-testid={`text-initiator-${t.id}`}>
                              {t.initiatorUser?.name || t.initiatorUser?.email || `#${t.initiatorUserId ?? "?"}`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t.createdAt ? format(new Date(t.createdAt), "MMM d, HH:mm") : "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDetailId(t.id)}
                                data-testid={`button-open-transfer-${t.id}`}
                              >
                                Open / فتح
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!transfers || transfers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No transfers / لا توجد تحويلات
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTransferDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        otherStores={otherStores}
        isAdmin={isAdmin}
        onCreated={() => qc.invalidateQueries({ queryKey: getGetErpTransfersQueryKey(queryParams) })}
      />
      {detailId !== null && (
        <TransferDetailDialog
          id={detailId}
          open={detailId !== null}
          onOpenChange={(o) => { if (!o) setDetailId(null); }}
          isAdmin={isAdmin}
          currentStoreId={currentStoreId}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: getGetErpTransferQueryKey(detailId) });
            qc.invalidateQueries({ queryKey: getGetErpTransfersQueryKey(queryParams) });
          }}
        />
      )}
    </div>
  );
}

// ─── Create dialog ────────────────────────────────────────────────
function CreateTransferDialog({
  open, onOpenChange, otherStores, isAdmin, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherStores: Array<{ id: number; nameEn: string; nameAr: string }>;
  isAdmin: boolean;
  onCreated: () => void;
}) {
  // direction = "out": current store sends/pushes to destination (current = source).
  // direction = "in":  current store requests/pulls from another source (current = destination).
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [otherStoreId, setOtherStoreId] = useState("");
  const [mode, setMode] = useState<"request" | "send">("request");
  const [notes, setNotes] = useState("");
  // "out" mode: lines reference products from current store (we have full product objects).
  // "in" mode: user types source-store product IDs — validated server-side.
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [scanQuery, setScanQuery] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  // For pull requests, products listed must be the SOURCE store's products,
  // which the current user can't list directly (only their store's products).
  // We rely on the backend to validate after submit.
  const { data: productsRes } = useGetProducts({ limit: 500 });
  const products = (productsRes?.products ?? []) as ProductLite[];
  const create = useCreateErpTransfer();

  const addLine = () => setLines((l) => [...l, { sourceProductId: "", quantity: "1" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((l) => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const reset = () => {
    setDirection("out"); setOtherStoreId(""); setMode("request"); setNotes("");
    setLines([]); setScanQuery(""); setScanError(null);
  };

  // When switching to "in" (pull request), force mode to request — direct
  // send from a store you're not on doesn't make sense.
  React.useEffect(() => {
    if (direction === "in" && mode === "send") setMode("request");
  }, [direction, mode]);

  // When toggling direction, reset the line buffer because the meaning changes
  // (current-store products vs. source-store IDs).
  React.useEffect(() => {
    setLines([]); setScanQuery(""); setScanError(null);
  }, [direction]);

  // Products eligible for scan/search: must have a reference or barcode
  // (otherwise the destination store can't match them).
  const matchableProducts = useMemo(
    () => products.filter((p) => productKey(p) !== null),
    [products],
  );

  const candidates = useMemo(() => {
    const t = scanQuery.trim().toLowerCase();
    if (!t) return [] as ProductLite[];
    const exact = findByCode(matchableProducts, t);
    if (exact) return [exact];
    return matchableProducts
      .filter(
        (p) =>
          (p.nameEn ?? "").toLowerCase().includes(t) ||
          (p.nameAr ?? "").toLowerCase().includes(t) ||
          (p.reference ?? "").toLowerCase().includes(t) ||
          (p.barcode ?? "").toLowerCase().includes(t),
      )
      .slice(0, 8);
  }, [scanQuery, matchableProducts]);

  function addProductToLines(p: ProductLite) {
    setScanError(null);
    setLines((prev) => {
      const idx = prev.findIndex((l) => Number(l.sourceProductId) === p.id);
      if (idx >= 0) {
        return prev.map((l, i) =>
          i === idx ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l,
        );
      }
      return [...prev, { sourceProductId: String(p.id), quantity: "1" }];
    });
    setScanQuery("");
  }

  function handleScanSubmit() {
    const t = scanQuery.trim();
    if (!t) return;
    const found = findByCode(matchableProducts, t);
    if (found) { addProductToLines(found); return; }
    // Fall back to a single search-text match if there's exactly one candidate.
    if (candidates.length === 1) { addProductToLines(candidates[0]); return; }
    if (candidates.length > 1) {
      setScanError(`Multiple matches for "${t}" — pick one from the list below.`);
      return;
    }
    setScanError(`No product matches "${t}".`);
  }

  // For "out": each line must be a product we know, with qty>0.
  // For "in": user-entered source product ID + qty>0.
  const linesWithProduct = useMemo(
    () =>
      lines.map((l) => ({
        ...l,
        product:
          direction === "out"
            ? products.find((p) => p.id === Number(l.sourceProductId))
            : undefined,
      })),
    [lines, products, direction],
  );

  const hasUnmatchable =
    direction === "out" &&
    linesWithProduct.some((l) => l.product && productKey(l.product) === null);
  const hasOverstock =
    direction === "out" &&
    linesWithProduct.some(
      (l) => l.product && Number(l.quantity) > (l.product.stock ?? 0),
    );

  const valid = useMemo(() => {
    if (!otherStoreId) return false;
    if (lines.length === 0) return false;
    if (!lines.every((l) => l.sourceProductId && Number(l.quantity) > 0)) return false;
    if (hasUnmatchable) return false;
    return true;
  }, [otherStoreId, lines, hasUnmatchable]);

  const submit = () => {
    const otherId = Number(otherStoreId);
    create.mutate(
      {
        data: {
          ...(direction === "out"
            ? { destinationStoreId: otherId }
            : { sourceStoreId: otherId }),
          mode,
          notes: notes || undefined,
          items: lines.map((l) => ({
            sourceProductId: Number(l.sourceProductId),
            quantity: Number(l.quantity),
          })),
        },
      },
      {
        onSuccess: () => { reset(); onCreated(); onOpenChange(false); },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Transfer / تحويل جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs mb-1 block">Direction / الاتجاه</Label>
            <div className="flex gap-2">
              <Button
                type="button" size="sm"
                variant={direction === "out" ? "default" : "outline"}
                onClick={() => setDirection("out")}
                data-testid="button-direction-out"
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Send to another store / إرسال إلى متجر آخر
              </Button>
              <Button
                type="button" size="sm"
                variant={direction === "in" ? "default" : "outline"}
                onClick={() => setDirection("in")}
                data-testid="button-direction-in"
              >
                <Inbox className="h-3.5 w-3.5 mr-1" /> Request from another store / طلب من متجر آخر
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">
                {direction === "out" ? "Destination Store / المتجر الوجهة" : "Source Store / المتجر المصدر"}
              </Label>
              <Select value={otherStoreId} onValueChange={setOtherStoreId}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-other-store">
                  <SelectValue placeholder="Pick a store" />
                </SelectTrigger>
                <SelectContent>
                  {otherStores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nameEn} / {s.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Mode / الوضع</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "request" | "send")} disabled={direction === "in"}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="request">
                    {direction === "out" ? "Request approval / طلب موافقة" : "Pull request / طلب سحب"}
                  </SelectItem>
                  {isAdmin && direction === "out" && (
                    <SelectItem value="send">Send directly (admin) / إرسال مباشر</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {mode === "send" && direction === "out" && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Stock will be deducted from source immediately / سيخصم المخزون فوراً من المصدر
                </p>
              )}
              {direction === "in" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  The source store admin must approve / يجب على إدارة المصدر الموافقة
                </p>
              )}
            </div>
          </div>
          {direction === "in" && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Enter the source store's product IDs (you may need to coordinate with that store).
              Items will be matched by reference/barcode against your store before submit.
              / أدخل معرّفات منتجات المتجر المصدر — سيتم مطابقتها مع متجرك بالمرجع/الباركود.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Items / الأصناف</Label>
              {direction === "in" && (
                <Button size="sm" variant="outline" type="button" onClick={addLine} data-testid="button-add-line">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add line / إضافة سطر
                </Button>
              )}
            </div>

            {direction === "out" && (
              <div className="mb-3 relative">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <ScanLine className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={scanQuery}
                      onChange={(e) => { setScanQuery(e.target.value); setScanError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleScanSubmit(); }
                      }}
                      placeholder="Scan or type reference / barcode / name…"
                      className="h-9 text-sm pl-8"
                      autoFocus
                      data-testid="input-scan"
                    />
                  </div>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={handleScanSubmit}
                    disabled={!scanQuery.trim()}
                    data-testid="button-scan-add"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add / إضافة
                  </Button>
                </div>
                {candidates.length > 0 && (
                  <div className="mt-1 border rounded-md bg-white shadow-sm max-h-56 overflow-y-auto" data-testid="scan-candidates">
                    {candidates.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0"
                        onClick={() => addProductToLines(p)}
                        data-testid={`button-pick-product-${p.id}`}
                      >
                        <div className="text-sm font-medium">{p.nameEn || p.nameAr}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {p.reference ?? "—"} {p.barcode ? `· ${p.barcode}` : ""} · stock {p.stock}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {scanError && (
                  <p className="text-[11px] text-red-600 mt-1" data-testid="text-scan-error">{scanError}</p>
                )}
                {matchableProducts.length < products.length && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {products.length - matchableProducts.length} product(s) hidden — missing reference/barcode.
                  </p>
                )}
              </div>
            )}

            {hasUnmatchable && (
              <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Some lines have no reference or barcode and can't be matched on the destination side. Remove them before submitting. /
                  بعض الأسطر بدون مرجع أو باركود — أزلها قبل الإرسال.
                </span>
              </div>
            )}
            {hasOverstock && (
              <div className="mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  One or more lines exceed available source stock. /
                  بعض الأسطر تتجاوز المخزون المتاح.
                </span>
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {lines.length === 0 && (
                <div className="text-xs text-muted-foreground border border-dashed rounded px-3 py-4 text-center">
                  {direction === "out"
                    ? "Scan or search a product above to add a line."
                    : "Add a line and enter the source store's product ID."}
                </div>
              )}
              {linesWithProduct.map((line, i) => {
                const p = line.product;
                const noKey = direction === "out" && p && productKey(p) === null;
                const qtyN = Number(line.quantity);
                const overStock = direction === "out" && p && qtyN > (p.stock ?? 0);
                return (
                  <div key={i} className="flex gap-2 items-start border rounded px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      {direction === "out" ? (
                        p ? (
                          <>
                            <div className="text-sm font-medium truncate">{p.nameEn || p.nameAr}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {p.reference ?? "—"} {p.barcode ? `· ${p.barcode}` : ""} · stock {p.stock}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Product #{line.sourceProductId} (unknown)</div>
                        )
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          placeholder="Source product ID"
                          className="h-8 text-sm"
                          value={line.sourceProductId}
                          onChange={(e) => updateLine(i, { sourceProductId: e.target.value })}
                          data-testid={`input-product-${i}`}
                        />
                      )}
                      {noKey && (
                        <p className="text-[11px] text-red-600 mt-1" data-testid={`text-line-nokey-${i}`}>
                          No reference/barcode — cannot match across stores.
                        </p>
                      )}
                      {overStock && (
                        <p className="text-[11px] text-amber-700 mt-1" data-testid={`text-line-overstock-${i}`}>
                          Insufficient stock — only {p?.stock ?? 0} available.
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm w-20"
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                      data-testid={`input-qty-${i}`}
                    />
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => removeLine(i)}
                      data-testid={`button-remove-line-${i}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Notes / ملاحظات</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-sm" />
          </div>

          {create.error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {(create.error as { error?: string })?.error ?? String(create.error)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel / إلغاء</Button>
          <Button onClick={submit} disabled={!valid || create.isPending} data-testid="button-submit-transfer">
            {mode === "send" ? "Send / إرسال" : "Request / طلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail dialog ────────────────────────────────────────────────
function TransferDetailDialog({
  id, open, onOpenChange, isAdmin, currentStoreId, onChanged,
}: {
  id: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  currentStoreId: number | null;
  onChanged: () => void;
}) {
  const { data: detail, isLoading } = useGetErpTransfer(id);
  const approve = useApproveErpTransfer();
  const reject = useRejectErpTransfer();
  const prepare = usePrepareErpTransfer();
  const ship = useShipErpTransfer();
  const receive = useReceiveErpTransfer();
  const cancel = useCancelErpTransfer();

  const t = detail as StockTransferDetail | undefined;
  // Action gating mirrors backend authz:
  //   - Employees: currentStoreId must equal the side's storeId
  //   - Admins:    may act on either side as long as they have a
  //                membership in user_stores for that side's store
  const { user: me } = useMe();
  const adminStoreIds = isAdmin ? new Set((me?.stores ?? []).map((s) => s.id)) : new Set<number>();
  const isSource = t ? (currentStoreId === t.sourceStoreId || adminStoreIds.has(t.sourceStoreId)) : false;
  const isDest = t ? (currentStoreId === t.destinationStoreId || adminStoreIds.has(t.destinationStoreId)) : false;

  const act = (m: { mutate: (v: { id: number }, opts: { onSuccess: () => void }) => void }) => {
    m.mutate({ id }, { onSuccess: () => onChanged() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transfer #{id} / تحويل
            {t && <StatusBadge status={t.status} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !t ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">From / من</div>
                <div className="font-medium">{t.sourceStore?.nameEn ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">To / إلى</div>
                <div className="font-medium">{t.destinationStore?.nameEn ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Started by / بدأ بواسطة</div>
                <div className="font-medium" data-testid="text-detail-initiator">
                  {t.initiatorUser?.name || t.initiatorUser?.email || `#${t.initiatorUserId ?? "?"}`}
                  <span className="text-xs text-muted-foreground ml-1">({t.initiatorSide})</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created / أُنشئ</div>
                <div className="font-medium text-sm">
                  {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy HH:mm") : "—"}
                </div>
              </div>
              {t.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Notes / ملاحظات</div>
                  <div className="text-sm">{t.notes}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Items / الأصناف</div>
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Match Key</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Source Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.items?.map((it) => {
                      const insufficient = typeof it.sourceProductStock === "number" && it.sourceProductStock < it.quantity;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-sm">{it.sourceProductNameEn ?? `#${it.sourceProductId}`}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{it.matchKey}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{it.quantity}</TableCell>
                          <TableCell className={`text-right tabular-nums ${insufficient ? "text-red-600 font-semibold" : ""}`}>
                            {it.sourceProductStock ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">History / السجل</div>
              <div className="space-y-1.5">
                {t.events?.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <StatusBadge status={e.status} />
                    <span className="text-muted-foreground">
                      {e.createdAt ? format(new Date(e.createdAt), "MMM d, HH:mm") : ""}
                    </span>
                    <span className="text-muted-foreground">
                      by {e.actorUser?.name || e.actorUser?.email || `#${e.actorUserId}`}
                    </span>
                    {e.notes && <span className="text-muted-foreground italic">— {e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {t.status === "requested" && isDest && (
                <>
                  <Button size="sm" onClick={() => act(approve)} disabled={approve.isPending} data-testid="button-approve">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve / قبول
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => act(reject)} disabled={reject.isPending} data-testid="button-reject">
                    <XCircle className="h-4 w-4 mr-1" /> Reject / رفض
                  </Button>
                </>
              )}
              {((t.status === "approved") || (t.status === "requested" && isAdmin)) && isSource && (
                <Button size="sm" onClick={() => act(prepare)} disabled={prepare.isPending} data-testid="button-prepare">
                  <PackageCheck className="h-4 w-4 mr-1" /> Prepare / تجهيز
                </Button>
              )}
              {t.status === "prepared" && isSource && (
                <Button size="sm" onClick={() => act(ship)} disabled={ship.isPending} data-testid="button-ship">
                  <Truck className="h-4 w-4 mr-1" /> Ship / إرسال
                </Button>
              )}
              {t.status === "in_transit" && isDest && (
                <Button size="sm" onClick={() => act(receive)} disabled={receive.isPending} data-testid="button-receive">
                  <Inbox className="h-4 w-4 mr-1" /> Receive / استلام
                </Button>
              )}
              {/* Cancel mirrors backend rule: source-side; after stock has
                  been decremented (prepared/in_transit) admin only. */}
              {!["received", "cancelled", "rejected"].includes(t.status) && isSource &&
               (!["prepared", "in_transit"].includes(t.status) || isAdmin) && (
                <Button size="sm" variant="outline" onClick={() => act(cancel)} disabled={cancel.isPending} data-testid="button-cancel-transfer">
                  <Ban className="h-4 w-4 mr-1" /> Cancel / إلغاء
                </Button>
              )}
            </div>
            {(approve.error || reject.error || prepare.error || ship.error || receive.error || cancel.error) && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {((approve.error || reject.error || prepare.error || ship.error || receive.error || cancel.error) as { error?: string })?.error ?? "Action failed"}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close / إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
