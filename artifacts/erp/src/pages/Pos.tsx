import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetProducts,
  useGetErpCustomers,
  useCreateOrder,
  getGetTransactionsQueryKey,
  type Product,
  type CustomerSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, ShoppingCart, Search, Save, RotateCcw, Printer,
  X, Eye, EyeOff, Settings, Users, Barcode, Check,
} from "lucide-react";

type CartLine = {
  productId: number;
  designation: string;
  qty: number;
  qtyBonus: number;
  pu: number;
  reduction: number;
};

const fmt = (n: number) =>
  n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Pos() {
  const qc = useQueryClient();
  const { data: productsResp } = useGetProducts({ limit: 500 });
  const { data: customersResp } = useGetErpCustomers();
  const createOrder = useCreateOrder();

  const products: Product[] = (productsResp?.products ?? []) as Product[];
  const customers: CustomerSummary[] = (customersResp ?? []) as CustomerSummary[];

  const [lines, setLines] = useState<CartLine[]>([]);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState(1);
  const [barcode, setBarcode] = useState("");
  const [showMontant, setShowMontant] = useState(true);
  const [client, setClient] = useState<CustomerSummary | null>(null);
  const [preparateur] = useState("Admin");
  const [versement, setVersement] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editLine, setEditLine] = useState<{ idx: number; line: CartLine } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [emptyState, setEmptyState] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);

  const subtotal = lines.reduce((s, l) => s + l.pu * l.qty, 0);
  const totalReduction = lines.reduce((s, l) => s + l.reduction, 0);
  const net = Math.max(0, subtotal - totalReduction);
  const reste = Math.max(0, net - versement);
  const totalArticles = lines.reduce((s, l) => s + l.qty + l.qtyBonus, 0);

  function addProduct(p: Product, addQty = 1) {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === p.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], qty: next[existing].qty + addQty };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          designation: (p.nameEn || p.nameAr || `Produit #${p.id}`).toUpperCase(),
          qty: addQty, qtyBonus: 0,
          pu: parseFloat(p.price ?? "0"),
          reduction: 0,
        },
      ];
    });
    setEmptyState(false);
  }

  function tryAddByCode(input: string, qtyToAdd: number) {
    if (!input.trim()) return;
    const trimmed = input.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode ?? "").toLowerCase() === trimmed ||
        (p.reference ?? "").toLowerCase() === trimmed ||
        String(p.id) === trimmed
    );
    if (found) {
      addProduct(found, qtyToAdd);
      setCode(""); setQty(1);
      setTimeout(() => codeRef.current?.focus(), 50);
    } else {
      setPickerOpen(true);
    }
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<CartLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function resetSale() {
    setLines([]); setVersement(0); setClient(null);
    setEmptyState(false); setCode(""); setQty(1);
  }

  function handlePaymentConfirm(opts: { mode: "comptant" | "terme"; cloture: boolean; impression: boolean }) {
    if (lines.length === 0) {
      alert("Ajoutez au moins un article / أضف منتجاً واحداً على الأقل");
      return;
    }
    const items = lines.map((l) => ({ productId: l.productId, quantity: l.qty }));
    const customerName = client?.name ?? "DIVER COMPTOIR";
    createOrder.mutate(
      { data: { customerName, customerPhone: "0000000000", customerAddress: "Vente comptoir", items } },
      {
        onSuccess: (order) => {
          qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
          if (opts.impression) { try { window.print(); } catch { /* noop */ } }
          setPaymentOpen(false);
          resetSale();
          if (opts.cloture) setEmptyState(true);
          alert(
            `Vente #${order.id} enregistrée (${opts.mode === "comptant" ? "Comptant" : "À terme"}).\n` +
            `Voir l'historique des commandes pour les détails.`
          );
        },
        onError: (err) => alert(`Erreur: ${(err as Error).message}`),
      }
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="relative">
              <Label className="text-[11px] text-muted-foreground absolute -top-2 left-3 bg-white px-1 z-10">Code</Label>
              <Input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") tryAddByCode(code, qty); }}
                className="h-11 pr-12"
                data-testid="input-code"
              />
              <Button
                size="icon" variant="ghost"
                className="absolute right-1 top-1 h-9 w-9 text-muted-foreground"
                onClick={() => setPickerOpen(true)}
                data-testid="button-open-picker"
                aria-label="Choisir un article"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Label className="text-[11px] text-muted-foreground absolute -top-2 left-3 bg-white px-1 z-10">Qté *</Label>
              <Input
                type="number" min="1" value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                onKeyDown={(e) => { if (e.key === "Enter") tryAddByCode(code, qty); }}
                className="h-11 pr-10 text-center font-semibold"
                data-testid="input-qty"
              />
              <Button
                size="icon" variant="ghost"
                className="absolute right-1 top-1 h-9 w-9 text-emerald-600"
                onClick={() => tryAddByCode(code, qty)} aria-label="Confirmer"
              >
                <Check className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold">Désignation</TableHead>
                  <TableHead className="text-center font-semibold w-16">Qté</TableHead>
                  <TableHead className="text-center font-semibold w-20">Qté Bonus</TableHead>
                  <TableHead className="text-right font-semibold w-24">PU</TableHead>
                  <TableHead className="text-right font-semibold w-24">Réduction</TableHead>
                  {showMontant && (<TableHead className="text-right font-semibold w-28">Montant</TableHead>)}
                  <TableHead className="w-10 text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setShowMontant((v) => !v)} aria-label="Toggle Montant">
                      {showMontant ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emptyState && lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showMontant ? 7 : 6} className="text-center py-12 text-red-500 italic">
                      Il faut créer une vente... / يجب إنشاء عملية بيع
                    </TableCell>
                  </TableRow>
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showMontant ? 7 : 6} className="text-center py-12 text-muted-foreground italic">
                      Scannez un code ou cliquez sur + pour ajouter un article
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {lines.map((l, idx) => (
                      <TableRow key={idx} data-testid={`row-line-${idx}`}>
                        <TableCell className="font-medium">{l.designation}</TableCell>
                        <TableCell className="text-center">{l.qty}</TableCell>
                        <TableCell className="text-center">{l.qtyBonus}</TableCell>
                        <TableCell className="text-right">{fmt(l.pu)}</TableCell>
                        <TableCell className="text-right">{fmt(l.reduction)}</TableCell>
                        {showMontant && (
                          <TableCell className="text-right font-semibold">
                            {fmt(l.pu * l.qty - l.reduction)}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setEditLine({ idx, line: { ...l } })}
                              aria-label="Modifier" data-testid={`button-edit-line-${idx}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500"
                              onClick={() => removeLine(idx)} aria-label="Supprimer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{lines.reduce((s, l) => s + l.qty, 0)}</TableCell>
                      <TableCell /><TableCell /><TableCell />
                      {showMontant && (<TableCell className="text-right">{fmt(net)}</TableCell>)}
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{lines.length} articles / {totalArticles} (KG)</span>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
              onClick={() => setPickerOpen(true)} aria-label="Ajouter article" data-testid="button-add-line">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-muted-foreground">
            <span className="text-xs font-medium">Midanic POS</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Ajouter"><Plus className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => setPaymentOpen(true)} aria-label="Sauvegarder"><Save className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={resetSale} aria-label="Annuler"><X className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Info"><Settings className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Précédent"><RotateCcw className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer" onClick={() => window.print()}><Printer className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Voir"><Eye className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Card className="bg-[#1B3057] text-white border-0 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <Row label="Total" value={fmt(subtotal)} />
            <Row label="Réduction" value={fmt(totalReduction)} />
            <div className="border-t border-white/20 my-1.5" />
            <Row label="Net" value={fmt(net)} highlight="green" />
            <Row label="Versement" value={fmt(versement)} muted />
            <Row label="Reste" value={fmt(reste)} highlight="red" />
            <Button
              className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base"
              onClick={() => setPaymentOpen(true)}
              data-testid="button-payer"
            >
              Payer
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" className="h-7 px-2 rounded-full text-emerald-600 border-emerald-200">A+</Button>
              <div className="flex items-center gap-1">
                <ClientPickerButton onPick={setClient} customers={customers} />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" aria-label="Liste clients">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground font-medium">Client :</span>
                <span className="font-semibold truncate" data-testid="text-client-name">
                  {client ? client.name : "DIVER COMPTOIR"}
                </span>
              </div>
              <div className="flex justify-between gap-2 mt-1">
                <span className="text-muted-foreground font-medium">Adresse :</span>
                <span className="text-xs truncate">{client?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2 mt-1">
                <span className="text-muted-foreground font-medium">Solde :</span>
                <span className={`font-semibold ${Number(client?.total_spent ?? 0) < 0 ? "text-red-600" : ""}`}>
                  {client ? fmt(Number(client.total_spent ?? 0)) : "0,00"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm flex justify-between">
              <span className="text-muted-foreground">Préparateur :</span>
              <span className="font-semibold">{preparateur}</span>
            </div>
            <div className="relative">
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    tryAddByCode(barcode, 1);
                    setBarcode("");
                  }
                }}
                placeholder="Code à Barres"
                className="h-9 pr-10 text-sm"
                data-testid="input-barcode"
              />
              <Barcode className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductPickerDialog
        open={pickerOpen} onOpenChange={setPickerOpen}
        products={products}
        onPick={(p) => { addProduct(p, 1); setPickerOpen(false); }}
      />

      <Dialog open={!!editLine} onOpenChange={(o) => !o && setEditLine(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier la ligne / تعديل السطر</DialogTitle>
          </DialogHeader>
          {editLine && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Désignation</Label>
                <Input value={editLine.line.designation} disabled className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Qté</Label>
                  <Input type="number" min="1" value={editLine.line.qty}
                    onChange={(e) => setEditLine({ ...editLine, line: { ...editLine.line, qty: Math.max(1, parseInt(e.target.value) || 1) } })}
                    className="h-9" data-testid="input-edit-qty" />
                </div>
                <div>
                  <Label className="text-xs">Qté Bonus</Label>
                  <Input type="number" min="0" value={editLine.line.qtyBonus}
                    onChange={(e) => setEditLine({ ...editLine, line: { ...editLine.line, qtyBonus: Math.max(0, parseInt(e.target.value) || 0) } })}
                    className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">PU (دج)</Label>
                  <Input type="number" step="0.01" value={editLine.line.pu}
                    onChange={(e) => setEditLine({ ...editLine, line: { ...editLine.line, pu: parseFloat(e.target.value) || 0 } })}
                    className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Réduction (دج)</Label>
                  <Input type="number" step="0.01" min="0" value={editLine.line.reduction}
                    onChange={(e) => setEditLine({ ...editLine, line: { ...editLine.line, reduction: Math.max(0, parseFloat(e.target.value) || 0) } })}
                    className="h-9" />
                </div>
              </div>
              <div className="bg-slate-50 rounded p-2 text-sm flex justify-between">
                <span>Montant ligne</span>
                <span className="font-bold">دج {fmt(editLine.line.pu * editLine.line.qty - editLine.line.reduction)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLine(null)}>Annuler</Button>
            <Button
              onClick={() => { if (editLine) { updateLine(editLine.idx, editLine.line); setEditLine(null); } }}
              data-testid="button-save-line"
            >Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paymentOpen} onOpenChange={setPaymentOpen}
        net={net} client={client}
        versement={versement} setVersement={setVersement}
        onConfirm={handlePaymentConfirm}
        isPending={createOrder.isPending}
      />
    </div>
  );
}

function Row({
  label, value, highlight, muted,
}: { label: string; value: string; highlight?: "green" | "red"; muted?: boolean }) {
  const valColor =
    highlight === "green" ? "text-emerald-400" :
    highlight === "red" ? "text-red-300" :
    muted ? "text-white/60" : "text-white";
  const labelColor = muted ? "text-white/60" : highlight ? "text-white/90" : "text-white/80";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={labelColor}>{label}</span>
      <span className={`font-bold ${highlight ? "text-lg" : ""} ${valColor}`}>{value}</span>
    </div>
  );
}

function ClientPickerButton({
  onPick, customers,
}: { onPick: (c: CustomerSummary | null) => void; customers: CustomerSummary[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600"
        onClick={() => setOpen(true)} aria-label="Choisir client" data-testid="button-pick-client">
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un client / اختيار العميل</DialogTitle>
          </DialogHeader>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtre" className="h-10" autoFocus />
          <div className="max-h-80 overflow-y-auto border rounded">
            <button type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b"
              onClick={() => { onPick(null); setOpen(false); }}>
              <span className="font-semibold">DIVER COMPTOIR</span>
              <span className="text-xs text-muted-foreground block">Client par défaut</span>
            </button>
            {filtered.map((c) => (
              <button key={c.id} type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b"
                onClick={() => { onPick(c); setOpen(false); }}
                data-testid={`button-client-${c.id}`}>
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground block">{c.email}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun client</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductPickerDialog({
  open, onOpenChange, products, onPick,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  products: Product[]; onPick: (p: Product) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  const filtered = useMemo(() => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return products;
    return products.filter(
      (p) =>
        (p.nameEn ?? "").toLowerCase().includes(trimmed) ||
        (p.nameAr ?? "").toLowerCase().includes(trimmed) ||
        (p.barcode ?? "").toLowerCase().includes(trimmed) ||
        (p.reference ?? "").toLowerCase().includes(trimmed)
    );
  }, [q, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Choisir un article / اختيار منتج</DialogTitle>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtre" className="h-11" autoFocus data-testid="input-picker-filter" />
        <div className="max-h-[60vh] overflow-y-auto border rounded">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun article trouvé</div>
          ) : (
            filtered.map((p) => (
              <button key={p.id} type="button"
                className="w-full flex items-center gap-3 px-3 py-2.5 border-b hover:bg-blue-50 text-left transition-colors"
                onClick={() => onPick(p)}
                data-testid={`button-pick-product-${p.id}`}>
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm uppercase truncate">
                    {p.nameEn || p.nameAr}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {parseFloat(p.price ?? "0").toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DZD
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-600 ml-2">{p.stock}</div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  open, onOpenChange, net, client, versement, setVersement, onConfirm, isPending,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  net: number; client: CustomerSummary | null;
  versement: number; setVersement: (n: number) => void;
  onConfirm: (opts: { mode: "comptant" | "terme"; cloture: boolean; impression: boolean }) => void;
  isPending: boolean;
}) {
  const [cloture, setCloture] = useState(true);
  const [impression, setImpression] = useState(true);
  const [versementOn, setVersementOn] = useState(false);
  const [localAmount, setLocalAmount] = useState("");

  const soldeClient = Number(client?.total_spent ?? 0);
  const seuilCredit = 20000;

  useEffect(() => {
    if (open) { setLocalAmount(""); setVersement(0); }
  }, [open, setVersement]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Règlement de la commande / تسوية الطلبية</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-4 text-sm pb-2 border-b">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={cloture} onCheckedChange={setCloture} data-testid="switch-cloture" />
              <span>Clôture</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={impression} onCheckedChange={setImpression} data-testid="switch-impression" />
              <span>Impression</span>
            </label>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solde actuel du client</span>
              <span className={soldeClient < 0 ? "text-red-600 font-semibold" : "font-semibold"}>{fmt(soldeClient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seuil de crédit</span>
              <span className="font-semibold">{fmt(seuilCredit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versement sur cet achat</span>
              <span className="font-semibold">{fmt(versement)}</span>
            </div>
          </div>

          <div className="relative">
            <Input
              type="number" step="0.01" min="0" value={localAmount}
              onChange={(e) => { setLocalAmount(e.target.value); setVersement(parseFloat(e.target.value) || 0); }}
              placeholder="0,00"
              className="h-12 text-xl font-bold pr-12 text-right"
              disabled={!versementOn}
              data-testid="input-versement"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">DA</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versement min nécessaire</span>
            <span className="font-semibold">0,00</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Switch checked={versementOn} onCheckedChange={setVersementOn} data-testid="switch-versement" />
            <span>Versement</span>
          </label>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-stretch">
          <Button variant="outline"
            className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => !isPending && onConfirm({ mode: "terme", cloture, impression })}
            data-testid="button-aterme">
            <RotateCcw className="h-4 w-4 mr-1.5" />À terme
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => !isPending && onConfirm({ mode: "comptant", cloture, impression })}
            data-testid="button-comptant">
            <Check className="h-4 w-4 mr-1.5" />Comptant ({fmt(net)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
