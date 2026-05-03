import React, { useState } from "react";
import {
  useGetErpStores, useCreateErpStore, useUpdateErpStore, useDeleteErpStore,
  getGetErpStoresQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store as StoreIcon, Plus, Trash2, Edit2 } from "lucide-react";

type FormState = { id?: number; nameAr: string; nameEn: string; slug: string; isActive: boolean };
const empty: FormState = { nameAr: "", nameEn: "", slug: "", isActive: true };

export default function Stores() {
  const qc = useQueryClient();
  const { data: stores, isLoading } = useGetErpStores();
  const create = useCreateErpStore();
  const update = useUpdateErpStore();
  const del = useDeleteErpStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetErpStoresQueryKey() });

  const handleSave = () => {
    setError(null);
    if (!form.nameAr.trim() || !form.nameEn.trim() || (!form.id && !form.slug.trim())) {
      setError("Nom AR, EN et slug requis / الاسم بالعربية والإنجليزية والمعرف مطلوبة");
      return;
    }
    if (form.id) {
      update.mutate(
        { id: form.id, data: { nameAr: form.nameAr.trim(), nameEn: form.nameEn.trim(), isActive: form.isActive } },
        { onSuccess: () => { invalidate(); setOpen(false); setForm(empty); },
          onError: (e: unknown) => setError((e as { message?: string })?.message ?? "Erreur") }
      );
    } else {
      create.mutate(
        { data: {
          nameAr: form.nameAr.trim(), nameEn: form.nameEn.trim(),
          slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          isActive: form.isActive,
        } },
        { onSuccess: () => { invalidate(); setOpen(false); setForm(empty); },
          onError: (e: unknown) => setError((e as { message?: string })?.message ?? "Erreur") }
      );
    }
  };

  const handleDelete = (id: number, name: string, itemCount: number) => {
    if (itemCount > 0) return;
    if (!confirm(`Supprimer ${name} ? / حذف ${name} ؟`)) return;
    del.mutate({ id }, {
      onSuccess: invalidate,
      onError: (e: unknown) => alert((e as { message?: string })?.message ?? "Erreur — possibly has data"),
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StoreIcon className="h-6 w-6 text-primary" />
            Magasins / المتاجر
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer vos points de vente / إدارة نقاط البيع
          </p>
        </div>
        <Button onClick={() => { setForm(empty); setError(null); setOpen(true); }} data-testid="button-new-store">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau / جديد
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Nom EN</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stores ?? []).map((s) => (
                    <TableRow key={s.id} data-testid={`row-store-${s.id}`}>
                      <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                      <TableCell className="font-medium">{s.nameEn}</TableCell>
                      <TableCell dir="rtl">{s.nameAr}</TableCell>
                      <TableCell>
                        {s.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Actif</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">Inactif</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7"
                          onClick={() => { setForm({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, slug: s.slug, isActive: s.isActive ?? true }); setError(null); setOpen(true); }}
                          data-testid={`btn-edit-store-${s.id}`}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                          onClick={() => handleDelete(s.id, s.nameEn, (s as { itemCount?: number }).itemCount ?? 0)}
                          disabled={((s as { itemCount?: number }).itemCount ?? 0) > 0}
                          title={((s as { itemCount?: number }).itemCount ?? 0) > 0
                            ? `Magasin non vide (${(s as { itemCount?: number }).itemCount} éléments). Réassignez ou supprimez les données d'abord. / المتجر يحتوي على بيانات`
                            : "Supprimer / حذف"}
                          data-testid={`btn-delete-store-${s.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stores || stores.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun magasin</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier magasin / تعديل المتجر" : "Nouveau magasin / متجر جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom EN *</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} data-testid="input-store-name-en" autoFocus />
            </div>
            <div>
              <Label dir="rtl">الاسم بالعربية *</Label>
              <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} data-testid="input-store-name-ar" />
            </div>
            {!form.id && (
              <div>
                <Label>Slug * (a-z, 0-9, -)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="principal" data-testid="input-store-slug" />
                <p className="text-xs text-muted-foreground mt-1">Identifiant unique permanent / معرف فريد دائم</p>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} data-testid="input-store-active" />
              <span>Actif / نشط</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler / إلغاء</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending} data-testid="button-save-store">
              {(create.isPending || update.isPending) ? "..." : "Enregistrer / حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
