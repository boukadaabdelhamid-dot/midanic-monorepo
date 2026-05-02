import React, { useState } from "react";
import {
  useGetErpCustomers, useGetErpCustomer, useCreateCustomerNote,
  getGetErpCustomersQueryKey, getGetErpCustomerQueryKey,
  type CustomerSummary, type CustomerNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, MessageSquarePlus } from "lucide-react";
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
  const { data: customers, isLoading } = useGetErpCustomers();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Customers / العملاء</h1>
        <p className="text-sm text-muted-foreground">Customer relationship management</p>
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
                      <TableCell>{c.total_orders ?? 0}</TableCell>
                      <TableCell className="font-semibold text-primary">دج {(c.total_spent ?? 0).toFixed(2)}</TableCell>
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
    </div>
  );
}
