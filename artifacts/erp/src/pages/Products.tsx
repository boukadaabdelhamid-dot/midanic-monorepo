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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Trash2, Pencil, Plus } from "lucide-react";

type ProductForm = {
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  price: string; stock: string;
  categoryId: string; imageUrl: string;
};

const emptyForm: ProductForm = {
  nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
  price: "", stock: "", categoryId: "", imageUrl: ""
};

export default function Products() {
  const qc = useQueryClient();
  const { data: productsRes, isLoading } = useGetProducts();
  const { data: categories } = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialog, setDialog] = useState<{ open: boolean; editing: Product | null }>({ open: false, editing: null });
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const products = productsRes?.products ?? [];

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true, editing: null }); };
  const openEdit = (p: Product) => {
    setForm({
      nameEn: p.nameEn ?? "", nameAr: p.nameAr ?? "",
      descriptionEn: p.descriptionEn ?? "", descriptionAr: p.descriptionAr ?? "",
      price: String(p.price ?? ""), stock: String(p.stock ?? ""),
      categoryId: String(p.categoryId ?? ""), imageUrl: p.imageUrl ?? ""
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
    if (!confirm("Delete this product?")) return;
    deleteProduct.mutate({ id }, {
      onSettled: () => qc.invalidateQueries({ queryKey: getGetProductsQueryKey() })
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products / المنتجات</h1>
          <p className="text-sm text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" /> Add Product / إضافة
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name EN</TableHead>
                    <TableHead>Name AR</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: Product) => (
                    <TableRow key={p.id} data-testid={`row-product-${p.id}`}>
                      <TableCell>
                        {p.imageUrl
                          ? <img src={p.imageUrl} className="w-10 h-10 object-cover rounded" alt="" />
                          : <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                        }
                      </TableCell>
                      <TableCell className="font-medium">{p.nameEn}</TableCell>
                      <TableCell dir="rtl" className="text-right">{p.nameAr}</TableCell>
                      <TableCell>دج {p.price}</TableCell>
                      <TableCell>
                        <span className={(p.stock ?? 0) < 5 ? "text-red-600 font-semibold" : ""}>{p.stock ?? 0}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.categoryId ?? "—"}</TableCell>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Edit Product / تعديل" : "Add Product / إضافة منتج"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: "Name (EN)", key: "nameEn" as keyof ProductForm },
              { label: "Name (AR)", key: "nameAr" as keyof ProductForm },
              { label: "Description (EN)", key: "descriptionEn" as keyof ProductForm },
              { label: "Description (AR)", key: "descriptionAr" as keyof ProductForm },
              { label: "السعر (دج)", key: "price" as keyof ProductForm },
              { label: "Stock", key: "stock" as keyof ProductForm },
              { label: "Image URL", key: "imageUrl" as keyof ProductForm },
            ] as const).map(({ label, key }) => (
              <div key={key} className={key.includes("escription") ? "col-span-2" : ""}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  type={key === "price" || key === "stock" ? "number" : "text"}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs mb-1 block">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c: Category) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending} data-testid="button-save-product">
              Save / حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
