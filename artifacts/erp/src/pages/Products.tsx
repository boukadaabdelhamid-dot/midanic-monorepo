import React, { useState, useRef } from "react";
import {
  useGetProducts, useGetCategories, useCreateProduct,
  useUpdateProduct, useDeleteProduct,
  getGetProductsQueryKey,
  type Product, type Category,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Trash2, Pencil, Plus, Search, Package, ImagePlus, X, Loader2,
  Smartphone, DollarSign, LayoutGrid, Image as ImageIcon, Eye, EyeOff,
} from "lucide-react";

const CATALOGUE_TYPES = ["ARTICLE", "PRODUITS", "APPAREIL", "ACCESSOIRE", "SERVICE", "Vrac"];
const NONE_VAL = "__none__";

type ProductForm = {
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  price: string; stock: string;
  categoryId: string; imageUrl: string;
  reference: string; barcode: string;
  costPrice: string; catalogueType: string;
  brand: string; model: string; color: string;
  colisage: string; weight: string;
  priceGros: string; priceSemiGros: string; priceMin: string;
  catalogue1: string; catalogue2: string; catalogue3: string;
  catalogue4: string; catalogue5: string; catalogue6: string;
  isActive: boolean; isExposed: boolean;
};

const emptyForm: ProductForm = {
  nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
  price: "", stock: "", categoryId: "", imageUrl: "",
  reference: "", barcode: "", costPrice: "", catalogueType: "ARTICLE",
  brand: "", model: "", color: "", colisage: "1", weight: "",
  priceGros: "", priceSemiGros: "", priceMin: "",
  catalogue1: "", catalogue2: "", catalogue3: "",
  catalogue4: "", catalogue5: "", catalogue6: "",
  isActive: true, isExposed: false,
};

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("midanic_token");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { url: string };
  return data.url;
}

function ToggleSwitch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        checked
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-gray-50 border-gray-300 text-gray-500"
      }`}
    >
      <span className={`inline-block w-8 h-4 rounded-full relative transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}

export default function Products() {
  const qc = useQueryClient();
  const { data: productsRes, isLoading } = useGetProducts({ limit: "200" });
  const { data: categories } = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [activeTab, setActiveTab] = useState("general");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch {
      setUploadError("فشل رفع الصورة — réessayez");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const products = (productsRes?.products ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.nameEn ?? "").toLowerCase().includes(q) ||
      (p.nameAr ?? "").toLowerCase().includes(q) ||
      (p.reference ?? "").toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setForm(emptyForm);
    setActiveTab("general");
    setDialog({ open: true, editing: null });
  };
  const openEdit = (p: Product) => {
    setForm({
      nameEn: p.nameEn ?? "", nameAr: p.nameAr ?? "",
      descriptionEn: p.descriptionEn ?? "", descriptionAr: p.descriptionAr ?? "",
      price: String(p.price ?? ""), stock: String(p.stock ?? ""),
      categoryId: String(p.categoryId ?? ""), imageUrl: p.imageUrl ?? "",
      reference: p.reference ?? "", barcode: p.barcode ?? "",
      costPrice: p.costPrice ?? "", catalogueType: p.catalogueType ?? "ARTICLE",
      brand: p.brand ?? "", model: p.model ?? "", color: p.color ?? "",
      colisage: String(p.colisage ?? 1), weight: p.weight ?? "",
      priceGros: p.priceGros ?? "", priceSemiGros: p.priceSemiGros ?? "",
      priceMin: p.priceMin ?? "",
      catalogue1: p.catalogue1 ?? "", catalogue2: p.catalogue2 ?? "",
      catalogue3: p.catalogue3 ?? "", catalogue4: p.catalogue4 ?? "",
      catalogue5: p.catalogue5 ?? "", catalogue6: p.catalogue6 ?? "",
      isActive: p.isActive ?? true, isExposed: p.isExposed ?? false,
    });
    setActiveTab("general");
    setDialog({ open: true, editing: p });
  };

  const handleSave = () => {
    const data = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      price: form.price,
      stock: parseInt(form.stock) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      imageUrl: form.imageUrl || undefined,
      reference: form.reference || null,
      barcode: form.barcode || null,
      costPrice: form.costPrice || null,
      catalogueType: form.catalogueType || "ARTICLE",
      brand: form.brand || null,
      model: form.model || null,
      color: form.color || null,
      colisage: parseInt(form.colisage) || 1,
      weight: form.weight || null,
      priceGros: form.priceGros || null,
      priceSemiGros: form.priceSemiGros || null,
      priceMin: form.priceMin || null,
      catalogue1: form.catalogue1 || null,
      catalogue2: form.catalogue2 || null,
      catalogue3: form.catalogue3 || null,
      catalogue4: form.catalogue4 || null,
      catalogue5: form.catalogue5 || null,
      catalogue6: form.catalogue6 || null,
      isActive: form.isActive,
      isExposed: form.isExposed,
    };
    const onSettled = () => {
      qc.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      setDialog({ open: false, editing: null });
    };
    if (dialog.editing) {
      updateProduct.mutate({ id: dialog.editing.id, data }, { onSettled });
    } else {
      createProduct.mutate({ data }, { onSettled });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    deleteProduct.mutate({ id }, {
      onSettled: () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey() })
    });
  };

  const toggleVisibility = (p: Product) => {
    updateProduct.mutate(
      { id: p.id, data: { isExposed: !p.isExposed } },
      { onSettled: () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey() }) }
    );
  };

  const toggleSelect = (id: number) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const categoryName = (id?: number | null) => {
    const c = (categories ?? []).find((c: Category) => c.id === id);
    return c ? c.nameEn : "—";
  };

  const catalogueTypeColor = (type?: string | null) => {
    switch (type) {
      case "ARTICLE": return "bg-sky-100 text-sky-700";
      case "PRODUITS": return "bg-violet-100 text-violet-700";
      case "APPAREIL": return "bg-amber-100 text-amber-700";
      case "ACCESSOIRE": return "bg-emerald-100 text-emerald-700";
      case "SERVICE": return "bg-rose-100 text-rose-700";
      case "Vrac": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const sf = (v: string) => (v === NONE_VAL ? "" : v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-cyan-500" />
            Articles / المنتجات
          </h1>
          <p className="text-sm text-muted-foreground">
            {productsRes?.total ?? 0} article(s) au total
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" /> Nouvel article / إضافة
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Rechercher (nom, réf, code)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selected.size > 0 && (
          <span className="text-sm text-muted-foreground">{selected.size} sélectionné(s)</span>
        )}
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 px-3">
                      <Checkbox
                        checked={selected.size === products.length && products.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Réf.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Catalogue</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Désignation</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-36">Code</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-28">PU Détail</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-28">Coût</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Stock</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20 text-center">Vitrine</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Aucun article trouvé
                      </TableCell>
                    </TableRow>
                  )}
                  {products.map((p: Product) => (
                    <TableRow
                      key={p.id}
                      data-testid={`row-product-${p.id}`}
                      className={`hover:bg-muted/30 transition-colors ${selected.has(p.id) ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="px-3">
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.reference ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${catalogueTypeColor(p.catalogueType)}`}>
                          {p.catalogueType ?? "ARTICLE"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />
                          )}
                          <div>
                            <p className="font-medium text-sm leading-tight">{p.nameEn}</p>
                            {p.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.barcode ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {p.price ? `${parseFloat(p.price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {p.costPrice ? `${parseFloat(p.costPrice).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${(p.stock ?? 0) === 0 ? "text-red-600" : (p.stock ?? 0) < 5 ? "text-amber-600" : "text-emerald-600"}`}>
                          {p.stock ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => toggleVisibility(p)}
                          title={p.isExposed ? "مرئي في المتجر — cliquer pour masquer" : "مخفي — cliquer pour afficher"}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                            p.isExposed
                              ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {p.isExposed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)} data-testid={`btn-edit-${p.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} data-testid={`btn-delete-${p.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DIALOG ===== */}
      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b">
            <DialogHeader className="flex-1">
              <DialogTitle className="text-base font-bold">
                {dialog.editing
                  ? `Modifier article n°${dialog.editing.id} / تعديل المنتج`
                  : "Nouvel article / منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mr-4">
              <ToggleSwitch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                label="Activé"
              />
              <ToggleSwitch
                checked={form.isExposed}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isExposed: v }))}
                label={form.isExposed ? "🌐 Visible en vitrine" : "🚫 Masqué du magasin"}
              />
              <Button
                onClick={handleSave}
                disabled={createProduct.isPending || updateProduct.isPending || !form.nameEn || !form.price}
                size="sm"
                data-testid="button-save-product"
                className="bg-[#1B3057] hover:bg-[#1B3057]/90"
              >
                Enregistrer / حفظ
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 border-b bg-muted/30">
              <TabsList className="h-10 bg-transparent gap-1 p-0">
                <TabsTrigger value="general" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#1B3057] rounded-none h-10 text-xs px-3">
                  <Smartphone className="h-3.5 w-3.5" /> GÉNÉRAL
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#1B3057] rounded-none h-10 text-xs px-3">
                  <DollarSign className="h-3.5 w-3.5" /> PRICING
                </TabsTrigger>
                <TabsTrigger value="catalogues" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#1B3057] rounded-none h-10 text-xs px-3">
                  <LayoutGrid className="h-3.5 w-3.5" /> CATALOGUES
                </TabsTrigger>
                <TabsTrigger value="images" className="flex items-center gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-[#1B3057] rounded-none h-10 text-xs px-3">
                  <ImageIcon className="h-3.5 w-3.5" /> IMAGES
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── GÉNÉRAL ── */}
              <TabsContent value="general" className="m-0 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[#1B3057]">
                    <Package className="h-4 w-4" /> Informations générales
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Type d'identification / نوع</Label>
                      <Select value={form.catalogueType} onValueChange={(v) => setForm((f) => ({ ...f, catalogueType: sf(v) }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATALOGUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Code à barres / باركود</Label>
                      <Input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} placeholder="5420008643231" className="h-8 text-sm font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Réf. / المرجع</Label>
                      <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="23102-E" className="h-8 text-sm font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs mb-1 block">Désignation (FR/EN) *</Label>
                      <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="Nom du produit" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">الاسم (AR) *</Label>
                      <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} dir="rtl" placeholder="اسم المنتج" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <Label className="text-xs mb-1 block">Marque / الماركة</Label>
                      <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Ex: L'Oréal" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Modèle / الموديل</Label>
                      <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ex: ESPAGNE" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Couleur / اللون</Label>
                      <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Ex: Noir" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <div>
                      <Label className="text-xs mb-1 block">Famille / التصنيف</Label>
                      <Select value={form.categoryId || NONE_VAL} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: sf(v) }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucune" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VAL}>Aucune</SelectItem>
                          {(categories ?? []).map((c: Category) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nameEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Stock</Label>
                      <Input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Colisage</Label>
                      <Input type="number" min="1" value={form.colisage} onChange={(e) => setForm((f) => ({ ...f, colisage: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Poids (kg)</Label>
                      <Input type="number" min="0" step="0.001" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[#1B3057]">
                    <Pencil className="h-4 w-4" /> Description e-commerce
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Description (FR/EN)</Label>
                      <textarea
                        value={form.descriptionEn}
                        onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">الوصف (AR)</Label>
                      <textarea
                        value={form.descriptionAr}
                        onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
                        dir="rtl"
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── PRICING ── */}
              <TabsContent value="pricing" className="m-0 p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-[#1B3057]">
                  <DollarSign className="h-4 w-4" /> Gestion des prix / الأسعار
                </h3>
                {form.costPrice && form.price && parseFloat(form.price) < parseFloat(form.costPrice) && (
                  <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-xs">
                    ⚠️ Attention: Certains prix sont inférieurs au coût !
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coût / التكلفة</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.costPrice}
                        onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                        className="h-10 text-sm"
                        placeholder="0,00"
                      />
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">DZD</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PU Détail / سعر البيع *</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        className="h-10 text-sm font-semibold"
                        placeholder="0,00"
                      />
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">DZD</span>
                    </div>
                    {form.costPrice && form.price && (
                      <p className="text-xs text-muted-foreground">
                        Marge: {(((parseFloat(form.price) - parseFloat(form.costPrice)) / parseFloat(form.costPrice)) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PU Gros</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.priceGros}
                        onChange={(e) => setForm((f) => ({ ...f, priceGros: e.target.value }))}
                        className="h-10 text-sm"
                        placeholder="0,00"
                      />
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">DZD</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PU Semi-Gros</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.priceSemiGros}
                        onChange={(e) => setForm((f) => ({ ...f, priceSemiGros: e.target.value }))}
                        className="h-10 text-sm"
                        placeholder="0,00"
                      />
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">DZD</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prix Min.</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" step="0.01"
                        value={form.priceMin}
                        onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
                        className="h-10 text-sm"
                        placeholder="0,00"
                      />
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">DZD</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── CATALOGUES ── */}
              <TabsContent value="catalogues" className="m-0 p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-[#1B3057]">
                  <LayoutGrid className="h-4 w-4" /> Configuration de l'article / تصنيفات
                </h3>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Catégories</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "catalogue1", label: "Catalogue 1" },
                      { key: "catalogue2", label: "Catalogue 2" },
                      { key: "catalogue3", label: "Catalogue 3" },
                      { key: "catalogue4", label: "Catalogue 4" },
                      { key: "catalogue5", label: "Catalogue 5" },
                      { key: "catalogue6", label: "Catalogue 6" },
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="border rounded-lg p-3">
                        <Label className="text-xs font-semibold mb-2 block text-muted-foreground">{label}</Label>
                        <Select
                          value={form[key] || NONE_VAL}
                          onValueChange={(v) => setForm((f) => ({ ...f, [key]: sf(v) }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VAL}>
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Plus className="h-3 w-3" /> Aucun
                              </span>
                            </SelectItem>
                            {CATALOGUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            {(categories ?? []).map((c: Category) => (
                              <SelectItem key={`cat-${c.id}`} value={c.nameEn}>{c.nameEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ── IMAGES ── */}
              <TabsContent value="images" className="m-0 p-5">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-[#1B3057]">
                  <ImageIcon className="h-4 w-4" /> Galerie d'images / معرض الصور
                </h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />
                <div className="grid grid-cols-2 gap-4">
                  {/* Image principale */}
                  <div className="border rounded-xl p-4 flex flex-col items-center gap-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-full">Image principale</p>
                    <div
                      className={`w-36 h-36 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${
                        form.imageUrl ? "border-[#1B3057]/30" : "border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <ImagePlus className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                          <p className="text-xs text-muted-foreground/60 mt-1">Image de l'article</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Chargement...</>
                        ) : (
                          <><ImagePlus className="h-3.5 w-3.5 mr-1" /> Ajouter une image</>
                        )}
                      </Button>
                      {form.imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-destructive hover:text-destructive"
                          onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      className="h-7 text-xs text-muted-foreground"
                      placeholder="ou coller une URL d'image..."
                    />
                  </div>

                  {/* Images disponibles */}
                  <div className="border rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Images disponibles</p>
                    {form.imageUrl ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative aspect-square rounded-lg overflow-hidden border">
                          <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Aucune image disponible</p>
                        <p className="text-xs text-muted-foreground/60">Ajoutez des images pour cet article</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

            </div>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-between items-center px-6 py-3 border-t bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setDialog({ open: false, editing: null })}>
              Annuler / إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={createProduct.isPending || updateProduct.isPending || !form.nameEn || !form.price}
              size="sm"
              data-testid="button-save-product-footer"
              className="bg-[#1B3057] hover:bg-[#1B3057]/90"
            >
              Enregistrer / حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
