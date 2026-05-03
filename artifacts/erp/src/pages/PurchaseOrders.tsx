import React, { useMemo, useState } from "react";
import {
  useGetPurchaseOrders, useCreatePurchaseOrder, useReceivePurchaseOrder,
  useGetSuppliers, useGetProducts, useCreateSupplier,
  useGetPurchaseOrderItems,
  getGetPurchaseOrdersQueryKey, getGetSuppliersQueryKey,
  type PurchaseOrder, type Supplier, type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  Plus, Pencil, Trash2, Search, Save, Eye, EyeOff, Cloud, History,
  FileText, Settings, Filter, X, Check, Truck, ShoppingBag, RefreshCw, Printer,
} from "lucide-react";
import { format } from "date-fns";
import InvoiceDialog from "@/components/InvoiceDialog";
import type { InvoiceData } from "@/components/InvoiceTemplate";
import { useCurrentStore } from "@/hooks/use-current-store";

const fmt = (n: number) =>
  n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const refOf = (id: number) => {
  const year = new Date().getFullYear();
  return `${String(id).padStart(6, "0")}/${year}`;
};

const statusLabel = (s: string) =>
  s === "received" ? "Clôturée" : s === "cancelled" ? "Annulée" : "En cours";

const statusClass = (s: string) =>
  s === "received"
    ? "bg-emerald-500 text-white"
    : s === "cancelled"
    ? "bg-red-100 text-red-700"
    : "bg-blue-500 text-white";

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const { data: pos, isLoading } = useGetPurchaseOrders();
  const { data: suppliers } = useGetSuppliers();
  const { data: productsRes } = useGetProducts({ limit: 500 });
  const createPO = useCreatePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();

  const products: Product[] = (productsRes?.products ?? []) as Product[];
  const supplierMap: Record<number, Supplier> = useMemo(() => {
    const m: Record<number, Supplier> = {};
    (suppliers ?? []).forEach((s: Supplier) => { m[s.id] = s; });
    return m;
  }, [suppliers]);

  const [refFilter, setRefFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const filtered = useMemo(() => {
    return (pos ?? []).filter((po) => {
      if (refFilter && !refOf(po.id).toLowerCase().includes(refFilter.toLowerCase())) return false;
      const sname = (supplierMap[po.supplierId]?.name ?? "").toLowerCase();
      if (supplierFilter && !sname.includes(supplierFilter.toLowerCase())) return false;
      if (statusFilter && !statusLabel(po.status).toLowerCase().includes(statusFilter.toLowerCase())) return false;
      if (po.createdAt) {
        const d = new Date(po.createdAt);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [pos, supplierMap, refFilter, supplierFilter, statusFilter, dateFrom, dateTo]);

  function openNew() {
    setEditingPO(null);
    setEditorOpen(true);
  }

  function openExisting(po: PurchaseOrder) {
    setEditingPO(po);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-[#1B3057]" />
          Achats / المشتريات
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestion des bons d'achat et fournisseurs / إدارة سندات الشراء والموردين
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
            <h2 className="font-semibold text-base">Achats ({filtered.length})</h2>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="h-8 bg-[#1B3057] hover:bg-[#142441]"
                onClick={openNew}
                data-testid="button-new-achat"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvel Achat / شراء جديد
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => qc.invalidateQueries({ queryKey: getGetPurchaseOrdersQueryKey() })}
                aria-label="Rafraîchir"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Importer">
                <Cloud className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Historique">
                <History className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Documents">
                <FileText className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Paramètres">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Réf.</TableHead>
                    <TableHead className="font-semibold">Création</TableHead>
                    <TableHead className="font-semibold">Fournisseur</TableHead>
                    <TableHead className="font-semibold text-center">État</TableHead>
                    <TableHead className="font-semibold text-right">Montant</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                  <TableRow className="bg-white border-b">
                    <TableCell className="py-1.5">
                      <FilterInput value={refFilter} onChange={setRefFilter} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex flex-col gap-1">
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs" />
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs" />
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <FilterInput value={supplierFilter} onChange={setSupplierFilter} />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <FilterInput value={statusFilter} onChange={setStatusFilter} />
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span className="text-xs text-muted-foreground">=</span>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        Aucune donnée disponible / لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((po) => (
                      <TableRow
                        key={po.id}
                        data-testid={`row-po-${po.id}`}
                        className="cursor-pointer hover:bg-blue-50/50"
                        onClick={() => openExisting(po)}
                      >
                        <TableCell className="font-medium text-slate-700">{refOf(po.id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {po.createdAt ? format(new Date(po.createdAt), "yyyy-MM-dd HH:mm:ss") : "—"}
                        </TableCell>
                        <TableCell className="font-medium uppercase">
                          {supplierMap[po.supplierId]?.name ?? `#${po.supplierId}`}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass(po.status)}`}>
                            {statusLabel(po.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {fmt(parseFloat(po.totalAmount ?? "0"))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); openExisting(po); }}
                            aria-label="Détails"
                          >
                            <span className="text-lg leading-none">⋮</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editingPO}
        suppliers={suppliers ?? []}
        products={products}
        onSave={(payload) => {
          createPO.mutate(
            { data: payload },
            {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: getGetPurchaseOrdersQueryKey() });
                setEditorOpen(false);
              },
              onError: (err) => alert(`Erreur: ${(err as Error).message}`),
            }
          );
        }}
        onClose={(po) => {
          receivePO.mutate({ id: po.id }, {
            onSettled: () => {
              qc.invalidateQueries({ queryKey: getGetPurchaseOrdersQueryKey() });
              setEditorOpen(false);
            },
          });
        }}
        saving={createPO.isPending || receivePO.isPending}
      />
    </div>
  );
}

function FilterInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Filter className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtre ..."
        className="h-7 text-xs pl-7"
      />
    </div>
  );
}

// =============================================================================
// Purchase editor dialog (Nouvel Achat / Modifier achat)
// =============================================================================

type EditLine = {
  productId: number;
  designation: string;
  qty: number;
  qtyPrepared: number;
  qtyGratuit: number;
  pu: number;
};

function PurchaseEditor({
  open, onOpenChange, editing, suppliers, products, onSave, onClose, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PurchaseOrder | null;
  suppliers: Supplier[];
  products: Product[];
  onSave: (payload: { supplierId: number; notes?: string; items: { productId: number; quantity: number; unitCost: number }[] }) => void;
  onClose: (po: PurchaseOrder) => void;
  saving: boolean;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [refAchat, setRefAchat] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [code, setCode] = useState("");
  const [showMontant, setShowMontant] = useState(true);
  const [invoiceShowTva, setInvoiceShowTva] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const store = useCurrentStore();

  const { data: existingItems } = useGetPurchaseOrderItems(editing?.id ?? 0, {
    query: { enabled: open && !!editing },
  });

  // Reset header + lines only when the dialog opens or the edited PO changes.
  // Do NOT depend on `suppliers` here — a supplier refetch must not wipe hydrated lines.
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setRefAchat(editing.notes || `Bon N°${editing.id}`);
      setDate(editing.createdAt ? editing.createdAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setLines([]);
    } else {
      setSupplier(null); setRefAchat(""); setLines([]); setCode("");
      setDate(new Date().toISOString().slice(0, 16));
    }
  }, [open, editing]);

  // Resolve supplier object as soon as the suppliers list is available.
  React.useEffect(() => {
    if (!open || !editing) return;
    const s = suppliers.find((x) => x.id === editing.supplierId);
    if (s) setSupplier(s);
  }, [open, editing, suppliers]);

  // Hydrate lines from server when items load for an existing PO
  React.useEffect(() => {
    if (!open || !editing || !existingItems) return;
    setLines(existingItems.map((it) => ({
      productId: it.productId,
      designation: (it.productNameEn || it.productNameAr || `#${it.productId}`).toUpperCase(),
      qty: it.quantity,
      qtyPrepared: editing.status === "received" ? it.quantity : 0,
      qtyGratuit: 0,
      pu: parseFloat(it.unitCost ?? "0"),
    })));
  }, [open, editing, existingItems]);

  const subtotal = lines.reduce((s, l) => s + l.pu * l.qty, 0);

  function addProduct(p: Product) {
    setLines((prev) => {
      if (prev.some((l) => l.productId === p.id)) return prev;
      return [...prev, {
        productId: p.id,
        designation: (p.nameEn || p.nameAr || `#${p.id}`).toUpperCase(),
        qty: 1, qtyPrepared: 0, qtyGratuit: 0,
        pu: parseFloat(p.price ?? "0"),
      }];
    });
  }

  function tryAddByCode(input: string) {
    const t = input.trim().toLowerCase();
    if (!t) { setProductPickerOpen(true); return; }
    const found = products.find(
      (p) =>
        (p.barcode ?? "").toLowerCase() === t ||
        (p.reference ?? "").toLowerCase() === t ||
        String(p.id) === t
    );
    if (found) { addProduct(found); setCode(""); }
    else setProductPickerOpen(true);
  }

  function updateLine(idx: number, patch: Partial<EditLine>) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!supplier) { alert("Choisissez un fournisseur / اختر مورداً"); return; }
    if (lines.length === 0) { alert("Ajoutez au moins un article"); return; }
    onSave({
      supplierId: supplier.id,
      notes: refAchat || undefined,
      items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, unitCost: l.pu })),
    });
  }

  const isExisting = !!editing;
  const isReceived = editing?.status === "received";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <div className="bg-emerald-700 text-white px-5 py-3 flex items-center justify-between">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <X className="h-4 w-4 cursor-pointer" onClick={() => onOpenChange(false)} />
              <span>
                {isExisting
                  ? `Modifier achat n°${editing?.id ?? ""}`
                  : "Nouvel Achat / شراء جديد"}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4">
          {isExisting && (
            <div className="text-sm text-slate-700 border-b pb-3">
              <span className="font-semibold">Bon d'Achat N°{editing?.id}</span>
              {" "}du{" "}
              <span>{editing?.createdAt ? format(new Date(editing.createdAt), "yyyy-MM-dd HH:mm:ss") : "—"}</span>
              {" "}pour le fournisseur{" "}
              <span className="font-semibold uppercase">{supplier?.name ?? "—"}</span>
            </div>
          )}

          {/* Header card: Éditeur d'achat */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="bg-blue-100 px-4 py-2.5 border-b flex items-center justify-between">
              <h3 className="font-semibold text-[#1B3057] flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Éditeur d'achat
              </h3>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                onClick={handleSave}
                disabled={saving}
                data-testid="button-save-achat"
                aria-label="Enregistrer"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-md p-3 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">Fournisseur</span>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-blue-600"
                    onClick={() => setSupplierPickerOpen(true)}
                    aria-label="Choisir fournisseur"
                    data-testid="button-pick-supplier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {supplier ? (
                  <div className="text-sm space-y-0.5">
                    <div><span className="text-muted-foreground">Nom: </span><span className="font-semibold uppercase">{supplier.name}</span></div>
                    <div><span className="text-muted-foreground">Adresse: </span>{supplier.address ?? "—"}</div>
                    <div><span className="text-muted-foreground">Contact: </span>{supplier.contactName ?? "—"}</div>
                    <div><span className="text-muted-foreground">Solde: </span><span className="font-semibold">0,00</span></div>
                  </div>
                ) : (
                  <div className="text-sm italic text-muted-foreground py-2 text-center">
                    Aucun fournisseur sélectionné
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1 block">Réf. Achat</Label>
                <Input value={refAchat} onChange={(e) => setRefAchat(e.target.value)}
                  placeholder="Référence..." className="h-9" data-testid="input-ref-achat" />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Date</Label>
                <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
            </CardContent>
          </Card>

          {/* Liste des articles */}
          <Card className="border shadow-sm">
            <div className="px-4 py-2.5 border-b flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Liste des articles
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusClass(editing?.status ?? "pending")}`}>
                  {statusLabel(editing?.status ?? "pending")}
                </span>
              </h3>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                  Importer des codes
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                  Importer des lignes
                </Button>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-[200px_1fr_1fr_60px] gap-2 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Code Article</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") tryAddByCode(code); }}
                    className="h-9"
                    disabled={isReceived}
                    data-testid="input-code-article"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Sélectionnez un article</Label>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start font-normal text-muted-foreground"
                    onClick={() => setProductPickerOpen(true)}
                    disabled={isReceived}
                    data-testid="button-select-article"
                  >
                    <Search className="h-3.5 w-3.5 mr-2" />
                    Sélectionnez un article
                  </Button>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Sélectionnez un produit</Label>
                  <Input placeholder="Sélectionnez un produit" disabled className="h-9" />
                </div>
                <Button
                  size="icon"
                  className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                  onClick={() => tryAddByCode(code)}
                  disabled={isReceived}
                  aria-label="Ajouter"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 border-b flex items-center justify-between">
                  <span className="font-semibold text-sm">Contenu</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => setShowMontant((v) => !v)} aria-label="Toggle Montant">
                    {showMontant ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-semibold">Désignation ↑</TableHead>
                      <TableHead className="font-semibold text-center w-20">Qté</TableHead>
                      <TableHead className="font-semibold text-center w-24">Qté Préparée</TableHead>
                      <TableHead className="font-semibold text-center w-24">Progression</TableHead>
                      <TableHead className="font-semibold text-center w-24">Qté Gratuite</TableHead>
                      <TableHead className="font-semibold text-right w-24">PU</TableHead>
                      {showMontant && <TableHead className="font-semibold text-right w-28">Montant</TableHead>}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showMontant ? 8 : 7} className="text-center py-10 text-muted-foreground italic">
                          Aucune donnée disponible / لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {lines.map((l, idx) => {
                          const progression = l.qty > 0 ? Math.round((l.qtyPrepared / l.qty) * 100) : 0;
                          return (
                            <TableRow key={idx} data-testid={`row-line-${idx}`}>
                              <TableCell className="font-medium uppercase text-xs">{l.designation}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number" min="1" value={l.qty}
                                  onChange={(e) => updateLine(idx, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="h-7 w-16 text-center text-xs mx-auto"
                                  disabled={isReceived}
                                  data-testid={`input-qty-${idx}`}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number" min="0" value={l.qtyPrepared}
                                  onChange={(e) => updateLine(idx, { qtyPrepared: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="h-7 w-16 text-center text-xs mx-auto"
                                  disabled={isReceived}
                                />
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                <span className={`px-2 py-0.5 rounded ${progression === 100 ? "bg-emerald-100 text-emerald-700" : progression > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                                  {progression}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number" min="0" value={l.qtyGratuit}
                                  onChange={(e) => updateLine(idx, { qtyGratuit: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="h-7 w-16 text-center text-xs mx-auto"
                                  disabled={isReceived}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number" step="0.01" min="0" value={l.pu}
                                  onChange={(e) => updateLine(idx, { pu: parseFloat(e.target.value) || 0 })}
                                  className="h-7 w-20 text-right text-xs ml-auto"
                                  disabled={isReceived}
                                />
                              </TableCell>
                              {showMontant && (
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {fmt(l.pu * l.qty)}
                                </TableCell>
                              )}
                              <TableCell>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                                  onClick={() => removeLine(idx)} disabled={isReceived}
                                  aria-label="Supprimer">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-slate-50 font-bold">
                          <TableCell>Total ({lines.length})</TableCell>
                          <TableCell className="text-center">{lines.reduce((s, l) => s + l.qty, 0)}</TableCell>
                          <TableCell className="text-center">{lines.reduce((s, l) => s + l.qtyPrepared, 0)}</TableCell>
                          <TableCell />
                          <TableCell className="text-center">{lines.reduce((s, l) => s + l.qtyGratuit, 0)}</TableCell>
                          <TableCell />
                          {showMontant && (
                            <TableCell className="text-right tabular-nums">{fmt(subtotal)}</TableCell>
                          )}
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-slate-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler / إلغاء
          </Button>
          {isExisting && (
            <>
              <Button
                variant="outline"
                className="border-[#1B3057] text-[#1B3057] hover:bg-blue-50"
                onClick={() => { setInvoiceShowTva(false); setInvoiceOpen(true); }}
                disabled={!supplier || lines.length === 0}
                title="Facture sans TVA / فاتورة بدون ضريبة"
                data-testid="button-print-purchase-invoice"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Facture / فاتورة
              </Button>
              <Button
                variant="ghost"
                className="text-amber-700 hover:bg-amber-50"
                onClick={() => { setInvoiceShowTva(true); setInvoiceOpen(true); }}
                disabled={!supplier || lines.length === 0}
                data-testid="button-print-purchase-invoice-tva"
                title="Facture avec TVA / مع ضريبة"
              >
                + TVA
              </Button>
            </>
          )}
          {isExisting && !isReceived && (
            <Button
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => editing && onClose(editing)}
              disabled={saving}
              data-testid="button-cloturer"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Clôturer / إغلاق
            </Button>
          )}
          {!isExisting && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving || !supplier || lines.length === 0}
              data-testid="button-enregistrer-achat"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Enregistrer / حفظ
            </Button>
          )}
        </DialogFooter>

        <InvoiceDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          data={editing ? {
            kind: "purchase",
            number: `FA-${String(editing.id).padStart(6, "0")}`,
            date: editing.createdAt ? new Date(editing.createdAt) : new Date(),
            store,
            party: {
              name: supplier?.name ?? "—",
              address: supplier?.address ?? null,
              phone: supplier?.phone ?? null,
            },
            lines: lines.map((l) => ({
              designation: l.designation,
              qty: l.qty,
              unitPrice: l.pu,
            })),
            showTva: invoiceShowTva,
            tvaRate: parseFloat(store?.tvaRate ?? "19"),
            notes: refAchat ? `Réf: ${refAchat}` : undefined,
          } : null}
        />

        <SupplierPickerDialog
          open={supplierPickerOpen}
          onOpenChange={setSupplierPickerOpen}
          suppliers={suppliers}
          onPick={(s) => { setSupplier(s); setSupplierPickerOpen(false); }}
        />

        <ProductPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          products={products}
          onPick={(p) => { addProduct(p); setProductPickerOpen(false); }}
        />
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Supplier picker dialog (Choisir un fournisseur)
// =============================================================================

function SupplierPickerDialog({
  open, onOpenChange, suppliers, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suppliers: Supplier[];
  onPick: (s: Supplier) => void;
}) {
  const qc = useQueryClient();
  const createSupplier = useCreateSupplier();
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (nom && !s.name.toLowerCase().includes(nom.toLowerCase())) return false;
      if (adresse && !(s.address ?? "").toLowerCase().includes(adresse.toLowerCase())) return false;
      if (ville && !(s.address ?? "").toLowerCase().includes(ville.toLowerCase())) return false;
      return true;
    });
  }, [suppliers, nom, adresse, ville]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSupplier.mutate(
      { data: { name: newName, address: newAddress || undefined, phone: newPhone || undefined } },
      {
        onSuccess: (s) => {
          qc.invalidateQueries({ queryKey: getGetSuppliersQueryKey() });
          setShowCreate(false); setNewName(""); setNewAddress(""); setNewPhone("");
          onPick(s);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="bg-blue-200 text-[#1B3057] px-5 py-3 flex items-center justify-between">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-base">
              Choisir un fournisseur / اختيار مورد
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Fournisseurs ({filtered.length})</h4>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600"
                onClick={() => setShowCreate((v) => !v)}
                aria-label="Ajouter fournisseur"
                data-testid="button-add-supplier-quick">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Visibilité">
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showCreate && (
            <div className="border rounded-md p-3 bg-slate-50 space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground">Nouveau fournisseur</h5>
              <div className="grid grid-cols-3 gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom *" className="h-8 text-sm" data-testid="input-new-supplier-name" />
                <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Adresse" className="h-8 text-sm" />
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Téléphone" className="h-8 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCreate(false)}>Annuler</Button>
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCreate} disabled={createSupplier.isPending || !newName.trim()}
                  data-testid="button-create-supplier-quick">
                  Créer
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-md overflow-hidden max-h-[55vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead className="font-semibold">Nom ↑</TableHead>
                  <TableHead className="font-semibold">Adresse</TableHead>
                  <TableHead className="font-semibold">Ville</TableHead>
                  <TableHead className="font-semibold text-right">Solde</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
                <TableRow>
                  <TableCell className="py-1.5"><FilterInput value={nom} onChange={setNom} /></TableCell>
                  <TableCell className="py-1.5"><FilterInput value={adresse} onChange={setAdresse} /></TableCell>
                  <TableCell className="py-1.5"><FilterInput value={ville} onChange={setVille} /></TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                      Aucun fournisseur
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-blue-50/50"
                      onClick={() => onPick(s)}
                      data-testid={`row-pick-supplier-${s.id}`}>
                      <TableCell className="font-semibold uppercase">{s.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.address ?? "—"}</TableCell>
                      <TableCell className="text-sm">—</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">0,00</TableCell>
                      <TableCell className="text-center">
                        <Button size="icon" variant="ghost"
                          className="h-7 w-7 text-blue-600"
                          onClick={(e) => { e.stopPropagation(); onPick(s); }}
                          aria-label="Choisir">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Product picker dialog (Sélectionnez un article)
// =============================================================================

function ProductPickerDialog({
  open, onOpenChange, products, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  onPick: (p: Product) => void;
}) {
  const [q, setQ] = useState("");
  React.useEffect(() => { if (open) setQ(""); }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter(
      (p) =>
        (p.nameEn ?? "").toLowerCase().includes(t) ||
        (p.nameAr ?? "").toLowerCase().includes(t) ||
        (p.barcode ?? "").toLowerCase().includes(t) ||
        (p.reference ?? "").toLowerCase().includes(t)
    );
  }, [q, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sélectionnez un article / اختيار منتج</DialogTitle>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtre"
          className="h-10" autoFocus data-testid="input-article-filter" />
        <div className="max-h-[55vh] overflow-y-auto border rounded">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Aucun article</div>
          ) : (
            filtered.map((p) => (
              <button key={p.id} type="button"
                className="w-full text-left px-3 py-2 border-b hover:bg-blue-50 transition-colors"
                onClick={() => onPick(p)}
                data-testid={`button-pick-article-${p.id}`}>
                <div className="font-semibold uppercase text-sm">{p.nameEn || p.nameAr}</div>
                <div className="text-xs text-muted-foreground">
                  {p.reference ?? p.barcode ?? `#${p.id}`} · {parseFloat(p.price ?? "0").toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DZD
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
