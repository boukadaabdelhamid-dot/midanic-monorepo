import React, { useState } from "react";
import {
  useGetErpCustomers, useGetErpCustomer, useCreateCustomerNote, useCreateErpCustomer,
  getGetErpCustomersQueryKey, getGetErpCustomerQueryKey,
  type CustomerSummary, type CustomerNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, MessageSquarePlus, UserPlus } from "lucide-react";
import { format } from "date-fns";

function CustomerDetailPanel({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: customer, isLoading } = useGetErpCustomer(customerId, {
    query: { enabled: !!customerId, queryKey: getGetErpCustomerQueryKey(customerId) }
  });
  const addNote = useCreateCustomerNote();
  const [note, setNote] = useState("");

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNote.mutate(
      { id: customerId, data: { note } },
      {
        onSettled: () => {
          qc.invalidateQueries({ queryKey: getGetErpCustomerQueryKey(customerId) });
          setNote("");
        }
      }
    );
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!customer) return <div className="p-6 text-muted-foreground">Not found</div>;

  const totalOrders = customer.orders?.length ?? 0;
  const totalSpent = (customer.orders ?? []).reduce((s, o) => s + parseFloat(o.totalAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{customer.name}</p>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-primary">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-primary">دج {totalSpent.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Spent</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Notes / ملاحظات</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {(customer.notes ?? []).map((n: CustomerNote) => (
            <div key={n.id} className="bg-muted/50 rounded-md p-3 text-sm">
              <p>{n.note}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {n.createdAt ? format(new Date(n.createdAt), "MMM d, yyyy") : ""}
              </p>
            </div>
          ))}
          {(!customer.notes || customer.notes.length === 0) && (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-sm flex-1"
            placeholder="Add a note..."
            data-testid="input-note"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <Button size="sm" onClick={handleAddNote} disabled={addNote.isPending || !note.trim()} data-testid="button-add-note">
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default function Customers() {
  const qc = useQueryClient();
  const { data: customers, isLoading } = useGetErpCustomers();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "", city: "", notes: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const createCustomer = useCreateErpCustomer();

  const handleCreate = () => {
    setCreateError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setCreateError("Name and email are required / الاسم والبريد مطلوبان");
      return;
    }
    createCustomer.mutate(
      { data: {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        notes: form.notes.trim() || undefined,
      } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetErpCustomersQueryKey() });
          setCreateOpen(false);
          setForm({ name: "", email: "", password: "", phone: "", address: "", city: "", notes: "" });
        },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? "Failed to create customer";
          setCreateError(msg);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Customers / العملاء</h1>
          <p className="text-sm text-muted-foreground">Customer relationship management</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-new-customer" className="bg-[#1B3057] hover:bg-[#1B3057]/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Nouveau client / عميل جديد
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customers ?? []).map((c: CustomerSummary) => (
                    <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                      <TableCell>{Number(c.total_orders ?? 0)}</TableCell>
                      <TableCell className="font-semibold text-primary">دج {Number(c.total_spent ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedId(c.id)} data-testid={`btn-view-${c.id}`}>
                          View / عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customers || customers.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Customer Details / تفاصيل العميل</DialogTitle></DialogHeader>
          {selectedId && <CustomerDetailPanel customerId={selectedId} onClose={() => setSelectedId(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setCreateError(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client / عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Informations de base / المعلومات الأساسية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cust-name">Nom / الاسم *</Label>
                  <Input id="cust-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-customer-name" autoFocus />
                </div>
                <div>
                  <Label htmlFor="cust-email">Email / البريد *</Label>
                  <Input id="cust-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-customer-email" />
                </div>
                <div>
                  <Label htmlFor="cust-phone">Téléphone / الهاتف</Label>
                  <Input id="cust-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+213 ..." data-testid="input-customer-phone" />
                </div>
                <div>
                  <Label htmlFor="cust-city">Ville / المدينة</Label>
                  <Input id="cust-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="input-customer-city" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="cust-address">Adresse / العنوان</Label>
              <Input id="cust-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>

            <div>
              <Label htmlFor="cust-notes">Notes / ملاحظات</Label>
              <textarea
                id="cust-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="input-customer-notes"
              />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Accès / الدخول</h4>
              <div>
                <Label htmlFor="cust-pwd">Mot de passe / كلمة المرور</Label>
                <Input id="cust-pwd" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Auto-généré si vide / يُولّد تلقائياً" data-testid="input-customer-password" />
                <p className="text-[11px] text-muted-foreground mt-1">Min. 6 caractères. Laissez vide pour générer automatiquement.</p>
              </div>
            </div>

            {createError && <p className="text-sm text-red-600" data-testid="text-create-error">{createError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler / إلغاء</Button>
            <Button onClick={handleCreate} disabled={createCustomer.isPending} className="bg-[#1B3057] hover:bg-[#1B3057]/90" data-testid="button-save-customer">
              {createCustomer.isPending ? "..." : "Enregistrer / حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
