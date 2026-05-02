import React, { useState } from "react";
import {
  useGetSuppliers, useCreateSupplier, useUpdateSupplier,
  getGetSuppliersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";

type SupplierForm = { name: string; contact: string; email: string; phone: string; country: string; };
const emptyForm: SupplierForm = { name: "", contact: "", email: "", phone: "", country: "" };

export default function Suppliers() {
  const qc = useQueryClient();
  const { data: suppliers, isLoading } = useGetSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const [dialog, setDialog] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true, editing: null }); };
  const openEdit = (s: any) => {
    setForm({ name: s.name ?? "", contact: s.contact ?? "", email: s.email ?? "", phone: s.phone ?? "", country: s.country ?? "" });
    setDialog({ open: true, editing: s });
  };

  const handleSave = () => {
    const onSettled = () => { qc.invalidateQueries({ queryKey: getGetSuppliersQueryKey() }); setDialog({ open: false, editing: null }); };
    if (dialog.editing) {
      updateSupplier.mutate({ id: dialog.editing.id, data: form }, { onSettled });
    } else {
      createSupplier.mutate({ data: form }, { onSettled });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers / الموردون</h1>
          <p className="text-sm text-muted-foreground">Manage your supplier network</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-supplier">
          <Plus className="h-4 w-4 mr-2" /> Add Supplier / إضافة
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(suppliers ?? []).map((s: any) => (
                    <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.contact}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.phone}</TableCell>
                      <TableCell>{s.country}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!suppliers || suppliers.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{dialog.editing ? "Edit Supplier" : "Add Supplier / إضافة مورد"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { label: "Company Name", key: "name" }, { label: "Contact Person", key: "contact" },
              { label: "Email", key: "email" }, { label: "Phone", key: "phone" },
              { label: "Country", key: "country" },
            ].map(({ label, key }) => (
              <div key={key} className={key === "name" ? "col-span-2" : ""}>
                <Label className="text-xs mb-1 block">{label}</Label>
                <Input value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={handleSave} disabled={createSupplier.isPending || updateSupplier.isPending} data-testid="button-save-supplier">Save / حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
