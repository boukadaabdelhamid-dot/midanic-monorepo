import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useGetProducts, useGetCategories, useCreateProduct,
  useUpdateProduct, useDeleteProduct,
  useGenerateProductBarcode,
  getGetProductsQueryKey,
  type Product, type Category,
} from "@workspace/api-client-react";
import JsBarcode from "jsbarcode";
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
  Columns3, Printer, Sparkles,
} from "lucide-react";

// ── Barcode rendering ───────────────────────────────────────────────
function BarcodeSvg({
  value, width = 1.6, height = 50, displayValue = true, fontSize = 12,
}: { value: string; width?: number; height?: number; displayValue?: boolean; fontSize?: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128",
        width, height, displayValue, fontSize, margin: 2,
      });
    } catch {
      // invalid value — clear svg
      if (ref.current) ref.current.innerHTML = "";
    }
  }, [value, width, height, displayValue, fontSize]);
  return <svg ref={ref} />;
}

type LabelTarget = { product: Product; qty: number };

// ── Column definitions ──────────────────────────────────────────────────
type ColKey =
  | "id" | "image" | "reference" | "catalogueType" | "designation"
  | "barcode" | "brand" | "model" | "color" | "categoryId"
  | "colisage" | "weight"
  | "catalogue1" | "catalogue2" | "catalogue3" | "catalogue4" | "catalogue5" | "catalogue6"
  | "description" | "createdAt"
  | "isExposed" | "isActive"
  | "price" | "priceGros" | "priceSemiGros" | "priceMin" | "costPrice"
  | "stock" | "vitrine" | "actions";

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: "id",           label: "Id #" },
  { key: "image",        label: "Image" },
  { key: "reference",    label: "Réf." },
  { key: "catalogueType",label: "Catalogue" },
  { key: "designation",  label: "Désignation" },
  { key: "description",  label: "Description" },
  { key: "barcode",      label: "Code" },
  { key: "brand",        label: "Marque" },
  { key: "model",        label: "Modèle" },
  { key: "color",        label: "Couleur" },
  { key: "categoryId",   label: "Famille" },
  { key: "colisage",     label: "Colisage" },
  { key: "weight",       label: "Poids" },
  { key: "catalogue1",   label: "Catalogue1" },
  { key: "catalogue2",   label: "Catalogue2" },
  { key: "catalogue3",   label: "Catalogue3" },
  { key: "catalogue4",   label: "Catalogue4" },
  { key: "catalogue5",   label: "Catalogue5" },
  { key: "catalogue6",   label: "Catalogue6" },
  { key: "createdAt",    label: "Création" },
  { key: "isExposed",    label: "Exposé" },
  { key: "isActive",     label: "Etat" },
  { key: "price",        label: "PU Détail" },
  { key: "priceGros",    label: "PU Gros" },
  { key: "priceSemiGros",label: "PU S.Gros" },
  { key: "priceMin",     label: "Prix Min" },
  { key: "costPrice",    label: "Coût" },
  { key: "stock",        label: "Stock" },
  { key: "vitrine",      label: "Vitrine" },
  { key: "actions",      label: "Actions" },
];

const DEFAULT_VISIBLE: ColKey[] = [
  "reference", "catalogueType", "designation", "barcode",
  "price", "costPrice", "stock", "vitrine", "actions",
];

function loadVisibleCols(): Set<ColKey> {
  try {
    const raw = localStorage.getItem("erp_product_cols");
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch { /* ignore */ }
  return new Set(DEFAULT_VISIBLE);
}
function saveVisibleCols(cols: Set<ColKey>) {
  localStorage.setItem("erp_product_cols", JSON.stringify([...cols]));
}

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
  const res = await fetch(`${API_BASE}/api/uploads`, {
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
  const { data: productsRes, isLoading } = useGetProducts({ limit: 200 });
  const { data: categories } = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const generateBarcode = useGenerateProductBarcode();
  const [labelDialog, setLabelDialog] = useState<{ items: LabelTarget[] } | null>(null);

  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [activeTab, setActiveTab] = useState("general");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => loadVisibleCols());
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);
  // Local override map — bypasses React Query cache for immediate UI feedback
  const [exposedMap, setExposedMap] = useState<Map<number, boolean>>(new Map());
  // Local product field overrides for dialog saves
  const [productOverrides, setProductOverrides] = useState<Map<number, Partial<Product>>>(new Map());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) {
        setColsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveVisibleCols(next);
      return next;
    });
  };
  const col = (key: ColKey) => visibleCols.has(key);

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
    const forceRefresh = () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey(), refetchType: "all" });
    const readErr = (err: unknown): string => {
      const e = err as { data?: { error?: string }; message?: string } | undefined;
      return e?.data?.error || e?.message || "Erreur inconnue";
    };
    if (dialog.editing) {
      const editingId = dialog.editing.id;
      updateProduct.mutate({ id: editingId, data }, {
        onSuccess: () => {
          // Immediately store overrides in local state so table updates without waiting for refetch
          setProductOverrides((m) => new Map(m).set(editingId, data as Partial<Product>));
          setDialog({ open: false, editing: null });
          forceRefresh();
        },
        onError: (err) => alert(`Erreur / خطأ: ${readErr(err)}`),
      });
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => { forceRefresh(); setDialog({ open: false, editing: null }); },
        onError: (err) => alert(`Erreur / خطأ: ${readErr(err)}`),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    deleteProduct.mutate({ id }, {
      onSettled: () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey(), refetchType: "all" })
    });
  };

  const getExposed = (p: Product) =>
    exposedMap.has(p.id) ? exposedMap.get(p.id)! : p.isExposed;

  const toggleVisibility = (p: Product) => {
    const newVal = !getExposed(p);
    // Flip icon immediately via local state — no cache dependency
    setExposedMap((m) => new Map(m).set(p.id, newVal));
    updateProduct.mutate(
      { id: p.id, data: { isExposed: newVal } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProductsQueryKey(), refetchType: "all" });
          // Keep local override permanently — it matches server truth; cleared on page refresh
        },
        onError: () => {
          // Revert on failure
          setExposedMap((m) => { const n = new Map(m); n.delete(p.id); return n; });
          alert("Erreur lors de la mise à jour");
        },
      }
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
          <>
            <span className="text-sm text-muted-foreground">{selected.size} sélectionné(s)</span>
            <Button
              variant="outline" size="sm" className="h-9 gap-2"
              onClick={() => {
                const items: LabelTarget[] = (productsRes?.products ?? [])
                  .filter((p) => selected.has(p.id) && p.barcode)
                  .map((p) => ({ product: p as Product, qty: 1 }));
                if (items.length === 0) {
                  alert("Aucun article sélectionné n'a de code-barres / لا يوجد منتج محدد له باركود");
                  return;
                }
                setLabelDialog({ items });
              }}
              data-testid="button-print-selected"
            >
              <Printer className="h-4 w-4" />
              Imprimer étiquettes / طباعة
            </Button>
          </>
        )}
        {/* Column visibility button */}
        <div ref={colsRef} className="relative ml-auto">
          <Button
            variant="outline" size="sm" className="h-9 gap-2"
            onClick={() => setColsOpen((v) => !v)}
          >
            <Columns3 className="h-4 w-4" />
            Colonnes
          </Button>
          {colsOpen && (
            <div className="absolute right-0 top-10 z-50 bg-white border rounded-md shadow-lg w-56 p-2 overflow-y-auto" style={{ maxHeight: 420 }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1 mb-1">
                Afficher / إظهار الأعمدة
              </p>
              <div className="space-y-0.5">
                {ALL_COLUMNS.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#1B3057] cursor-pointer"
                      checked={visibleCols.has(c.key)}
                      onChange={() => toggleCol(c.key)}
                    />
                    <span className="text-sm">{c.label}</span>
                  </label>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex gap-1">
                <button
                  className="flex-1 h-7 text-xs rounded hover:bg-muted/50 transition-colors"
                  onClick={() => { const s = new Set(ALL_COLUMNS.map(c => c.key) as ColKey[]); setVisibleCols(s); saveVisibleCols(s); }}
                >
                  Tout afficher
                </button>
                <button
                  className="flex-1 h-7 text-xs rounded hover:bg-muted/50 transition-colors"
                  onClick={() => { const s = new Set(DEFAULT_VISIBLE); setVisibleCols(s); saveVisibleCols(s); }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>
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
                      <Checkbox checked={selected.size === products.length && products.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    {col("id")           && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-16">Id #</TableHead>}
                    {col("image")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-14">Image</TableHead>}
                    {col("reference")    && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Réf.</TableHead>}
                    {col("catalogueType")&& <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Catalogue</TableHead>}
                    {col("designation")  && <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Désignation</TableHead>}
                    {col("description")  && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-40">Description</TableHead>}
                    {col("barcode")      && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-36">Code</TableHead>}
                    {col("brand")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Marque</TableHead>}
                    {col("model")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Modèle</TableHead>}
                    {col("color")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Couleur</TableHead>}
                    {col("categoryId")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Famille</TableHead>}
                    {col("colisage")     && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Colisage</TableHead>}
                    {col("weight")       && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Poids</TableHead>}
                    {col("catalogue1")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.1</TableHead>}
                    {col("catalogue2")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.2</TableHead>}
                    {col("catalogue3")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.3</TableHead>}
                    {col("catalogue4")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.4</TableHead>}
                    {col("catalogue5")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.5</TableHead>}
                    {col("catalogue6")   && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-24">Cat.6</TableHead>}
                    {col("createdAt")    && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-28">Création</TableHead>}
                    {col("isExposed")    && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Exposé</TableHead>}
                    {col("isActive")     && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Etat</TableHead>}
                    {col("price")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-28">PU Détail</TableHead>}
                    {col("priceGros")    && <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-24">PU Gros</TableHead>}
                    {col("priceSemiGros")&& <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-24">PU S.Gros</TableHead>}
                    {col("priceMin")     && <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-24">Prix Min</TableHead>}
                    {col("costPrice")    && <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-28">Coût</TableHead>}
                    {col("stock")        && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20">Stock</TableHead>}
                    {col("vitrine")      && <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-20 text-center">Vitrine</TableHead>}
                    {col("actions")      && <TableHead className="w-20"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleCols.size + 1} className="text-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Aucun article trouvé
                      </TableCell>
                    </TableRow>
                  )}
                  {products.map((rawP: Product) => {
                    // Merge local overrides so saves reflect immediately in table
                    const p: Product = productOverrides.has(rawP.id)
                      ? { ...rawP, ...productOverrides.get(rawP.id) }
                      : rawP;
                    return (
                    <TableRow
                      key={p.id}
                      data-testid={`row-product-${p.id}`}
                      className={`hover:bg-muted/30 transition-colors ${selected.has(p.id) ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="px-3">
                        <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </TableCell>
                      {col("id")           && <TableCell className="text-xs text-muted-foreground font-mono">{p.id}</TableCell>}
                      {col("image")        && (
                        <TableCell>
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover border" />
                            : <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" /></div>
                          }
                        </TableCell>
                      )}
                      {col("reference")    && <TableCell className="font-mono text-sm text-muted-foreground">{p.reference ?? "—"}</TableCell>}
                      {col("catalogueType")&& (
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${catalogueTypeColor(p.catalogueType)}`}>
                            {p.catalogueType ?? "ARTICLE"}
                          </span>
                        </TableCell>
                      )}
                      {col("designation")  && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!col("image") && p.imageUrl && (
                              <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border" />
                            )}
                            <div>
                              <p className="font-medium text-sm leading-tight">{p.nameEn}</p>
                              {p.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</p>}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {col("description")  && <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{p.descriptionEn ?? "—"}</TableCell>}
                      {col("barcode")      && <TableCell className="font-mono text-xs text-muted-foreground">{p.barcode ?? "—"}</TableCell>}
                      {col("brand")        && <TableCell className="text-sm">{p.brand ?? "—"}</TableCell>}
                      {col("model")        && <TableCell className="text-sm">{p.model ?? "—"}</TableCell>}
                      {col("color")        && <TableCell className="text-sm">{p.color ?? "—"}</TableCell>}
                      {col("categoryId")   && <TableCell className="text-sm">{categoryName(p.categoryId)}</TableCell>}
                      {col("colisage")     && <TableCell className="text-sm text-center">{p.colisage ?? 1}</TableCell>}
                      {col("weight")       && <TableCell className="text-sm">{p.weight ? `${p.weight} kg` : "—"}</TableCell>}
                      {col("catalogue1")   && <TableCell className="text-xs">{p.catalogue1 ?? "—"}</TableCell>}
                      {col("catalogue2")   && <TableCell className="text-xs">{p.catalogue2 ?? "—"}</TableCell>}
                      {col("catalogue3")   && <TableCell className="text-xs">{p.catalogue3 ?? "—"}</TableCell>}
                      {col("catalogue4")   && <TableCell className="text-xs">{p.catalogue4 ?? "—"}</TableCell>}
                      {col("catalogue5")   && <TableCell className="text-xs">{p.catalogue5 ?? "—"}</TableCell>}
                      {col("catalogue6")   && <TableCell className="text-xs">{p.catalogue6 ?? "—"}</TableCell>}
                      {col("createdAt")    && (
                        <TableCell className="text-xs text-muted-foreground">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-DZ") : "—"}
                        </TableCell>
                      )}
                      {col("isExposed")    && (
                        <TableCell className="text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.isExposed ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {p.isExposed ? "Oui" : "Non"}
                          </span>
                        </TableCell>
                      )}
                      {col("isActive")     && (
                        <TableCell className="text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.isActive !== false ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-600"}`}>
                            {p.isActive !== false ? "Actif" : "Inactif"}
                          </span>
                        </TableCell>
                      )}
                      {col("price")        && (
                        <TableCell className="text-right font-bold text-sm">
                          {p.price ? `${parseFloat(p.price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                        </TableCell>
                      )}
                      {col("priceGros")    && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {p.priceGros ? `${parseFloat(p.priceGros).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                        </TableCell>
                      )}
                      {col("priceSemiGros")&& (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {p.priceSemiGros ? `${parseFloat(p.priceSemiGros).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                        </TableCell>
                      )}
                      {col("priceMin")     && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {p.priceMin ? `${parseFloat(p.priceMin).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                        </TableCell>
                      )}
                      {col("costPrice")    && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {p.costPrice ? `${parseFloat(p.costPrice).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج` : "—"}
                        </TableCell>
                      )}
                      {col("stock")        && (
                        <TableCell>
                          <span className={`text-sm font-semibold ${(p.stock ?? 0) === 0 ? "text-red-600" : (p.stock ?? 0) < 5 ? "text-amber-600" : "text-emerald-600"}`}>
                            {p.stock ?? 0}
                          </span>
                        </TableCell>
                      )}
                      {col("vitrine")      && (
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleVisibility(p)}
                            title={getExposed(p) ? "مرئي — cliquer pour masquer" : "مخفي — cliquer pour afficher"}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                              getExposed(p)
                                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            {getExposed(p) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                        </TableCell>
                      )}
                      {col("actions")      && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)} data-testid={`btn-edit-${p.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              disabled={!p.barcode}
                              onClick={() => setLabelDialog({ items: [{ product: p, qty: 1 }] })}
                              data-testid={`btn-print-${p.id}`}
                              title={p.barcode ? "Imprimer étiquette / طباعة" : "Aucun code-barres"}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} data-testid={`btn-delete-${p.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })}
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
                      <div className="flex gap-1">
                        <Input
                          value={form.barcode}
                          onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                          placeholder="5420008643231"
                          className="h-8 text-sm font-mono flex-1"
                          data-testid="input-barcode"
                        />
                        <Button
                          type="button" size="sm" variant="outline"
                          className="h-8 px-2 shrink-0"
                          disabled={generateBarcode.isPending}
                          onClick={() => {
                            generateBarcode.mutate(undefined, {
                              onSuccess: (r) => setForm((f) => ({ ...f, barcode: r.barcode })),
                              onError: (e) => {
                                const err = e as { data?: { error?: string }; message?: string };
                                alert(`Erreur / خطأ: ${err?.data?.error || err?.message || "Echec génération"}`);
                              },
                            });
                          }}
                          data-testid="button-generate-barcode"
                          title="Générer un code-barres unique / توليد"
                        >
                          {generateBarcode.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Sparkles className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      {form.barcode && (
                        <div className="mt-2 flex items-center gap-2 bg-white border rounded p-1.5">
                          <BarcodeSvg value={form.barcode} height={32} fontSize={9} width={1.2} />
                          {dialog.editing && (
                            <Button
                              type="button" size="sm" variant="ghost"
                              className="h-7 px-2 ml-auto"
                              onClick={() => setLabelDialog({ items: [{ product: { ...dialog.editing!, barcode: form.barcode, reference: form.reference, price: form.price, nameEn: form.nameEn, nameAr: form.nameAr }, qty: 1 }] })}
                              title="Imprimer étiquette / طباعة الملصق"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
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

      {labelDialog && (
        <PrintLabelsDialog
          items={labelDialog.items}
          onClose={() => setLabelDialog(null)}
        />
      )}
    </div>
  );
}

// ── Print Labels Dialog ─────────────────────────────────────────────
function PrintLabelsDialog({
  items, onClose,
}: { items: LabelTarget[]; onClose: () => void }) {
  const [size, setSize] = useState<"small" | "medium">("medium");
  const [rows, setRows] = useState<LabelTarget[]>(items);

  const setQty = (idx: number, qty: number) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: Math.max(1, qty) } : r)));

  const allLabels = useMemo<Product[]>(
    () => rows.flatMap((r) => Array.from({ length: r.qty }, () => r.product)),
    [rows],
  );

  const dims =
    size === "small"
      ? { w: "40mm", h: "25mm", barH: 28, barW: 1.1, font: 8, name: "10px" }
      : { w: "60mm", h: "35mm", barH: 40, barW: 1.4, font: 10, name: "12px" };

  const handlePrint = () => {
    setTimeout(() => window.print(), 50);
  };

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <div className="flex items-center justify-between px-5 py-3 border-b print:hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Imprimer étiquettes / طباعة الملصقات
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Taille</Label>
              <Select value={size} onValueChange={(v) => setSize(v as "small" | "medium")}>
                <SelectTrigger className="h-8 text-xs w-32" data-testid="select-label-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petit (40×25mm)</SelectItem>
                  <SelectItem value="medium">Moyen (60×35mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="bg-[#1B3057] hover:bg-[#1B3057]/90"
              onClick={handlePrint}
              data-testid="button-print-labels"
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimer / طباعة
            </Button>
          </div>
        </div>

        <div className="px-5 py-3 border-b print:hidden bg-muted/20">
          <Label className="text-xs mb-2 block font-semibold">Quantité par article</Label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={r.product.id + "-" + i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  <span className="font-medium">{r.product.nameEn}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{r.product.barcode}</span>
                </span>
                <Input
                  type="number" min={1} value={r.qty}
                  onChange={(e) => setQty(i, parseInt(e.target.value) || 1)}
                  className="h-7 w-20 text-sm"
                  data-testid={`input-label-qty-${i}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white" id="midanic-print-area">
          <div
            className="grid gap-2 print:gap-1"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${dims.w}, 1fr))`,
            }}
          >
            {allLabels.map((p, idx) => (
              <div
                key={idx}
                className="border border-gray-300 rounded p-1 flex flex-col items-center text-center bg-white"
                style={{ width: dims.w, height: dims.h, breakInside: "avoid" }}
              >
                <div
                  className="font-semibold leading-tight truncate w-full"
                  style={{ fontSize: dims.name }}
                  title={p.nameEn}
                >
                  {p.nameEn}
                </div>
                {p.price && (
                  <div className="font-bold leading-tight" style={{ fontSize: dims.name }}>
                    {parseFloat(p.price).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} دج
                  </div>
                )}
                <div className="mt-auto">
                  <BarcodeSvg
                    value={p.barcode ?? ""}
                    height={dims.barH}
                    width={dims.barW}
                    fontSize={dims.font}
                  />
                </div>
                {p.reference && (
                  <div className="text-[8px] text-muted-foreground font-mono leading-none">
                    {p.reference}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
