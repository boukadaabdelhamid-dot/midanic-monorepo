import React, { useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Trash2, Pencil, Plus, Search, Package } from "lucide-react";

const CATALOGUE_TYPES = ["ARTICLE", "PRODUITS", "APPAREIL", "ACCESSOIRE", "SERVICE"];

type ProductForm = {
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  price: string; stock: string;
  categoryId: string; imageUrl: string;
  reference: string; barcode: string;
  costPrice: string; catalogueType: string;
};

const emptyForm: ProductForm = {
  nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
  price: "", stock: "", categoryId: "", imageUrl: "",
  reference: "", barcode: "", costPrice: "", catalogueType: "ARTICLE"
};

export default function Products() {
  const qc = useQueryClient();
  const { data: productsRes, isLoading } = useGetProducts({ limit: "200" });
  const { data: categories } = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true, editing: null }); };
  const openEdit = (p: Product) => {
    setForm({
      nameEn: p.nameEn ?? "", nameAr: p.nameAr ?? "",
      descriptionEn: p.descriptionEn ?? "", descriptionAr: p.descriptionAr ?? "",
      price: String(p.price ?? ""), stock: String(p.stock ?? ""),
      categoryId: String(p.categoryId ?? ""), imageUrl: p.imageUrl ?? "",
      reference: p.reference ?? "", barcode: p.barcode ?? "",
      costPrice: p.costPrice ?? "", catalogueType: p.catalogueType ?? "ARTICLE",
    });
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

  const toggleSelect = (id: number) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
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
      default: return "bg-gray-100 text-gray-600";
    }
  };

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
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                        <Checkbox
                          checked={selected.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${catalogueTypeColor(p.catalogueType)}`}>
                          {p.catalogueType ?? "ARTICLE"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm leading-tight">{p.nameEn}</p>
                          {p.nameAr && (
                            <p className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.barcode ?? "—"}
                      </TableCell>
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

      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Modifier l'article / تعديل" : "Nouvel article / إضافة منتج"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Réf. (Référence)</Label>
              <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Ex: 23102-E" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Catalogue / النوع</Label>
              <Select value={form.catalogueType} onValueChange={(v) => setForm((f) => ({ ...f, catalogueType: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATALOGUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Désignation (FR/EN)</Label>
              <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="Nom du produit" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">الاسم (AR)</Label>
              <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} dir="rtl" className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Code barres / الباركود</Label>
              <Input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} placeholder="Ex: 5420008643231" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">PU Détail / سعر البيع (دج)</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Coût / سعر التكلفة (دج)</Label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Stock</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Catégorie / التصنيف</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c: Category) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Description (FR/EN)</Label>
              <Input value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">الوصف (AR)</Label>
              <Input value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} dir="rtl" className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Image URL</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Annuler / إلغاء</Button>
            <Button
              onClick={handleSave}
              disabled={createProduct.isPending || updateProduct.isPending || !form.nameEn || !form.price}
              data-testid="button-save-product"
            >
              Enregistrer / حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
