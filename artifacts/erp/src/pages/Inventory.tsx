import React, { useState } from "react";
import {
  useGetInventoryMovements, useAdjustInventory, useGetProducts,
  getGetInventoryMovementsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  in: "bg-emerald-100 text-emerald-700",
  out: "bg-red-100 text-red-700",
  adjustment: "bg-blue-100 text-blue-700",
};

export default function Inventory() {
  const qc = useQueryClient();
  const { data: movements, isLoading } = useGetInventoryMovements();
  const { data: productsRes } = useGetProducts();
  const adjustInventory = useAdjustInventory();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", reason: "" });

  const products = productsRes?.products ?? [];
  const productMap: Record<number, string> = {};
  products.forEach((p: any) => { productMap[p.id] = p.nameEn; });

  const handleSave = () => {
    adjustInventory.mutate(
      { data: { productId: parseInt(form.productId), quantity: parseInt(form.quantity), reason: form.reason } },
      { onSettled: () => { qc.invalidateQueries({ queryKey: getGetInventoryMovementsQueryKey() }); setOpen(false); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory / المخزون</h1>
          <p className="text-sm text-muted-foreground">Track stock movements</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-adjust-inventory">
          <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock / تعديل المخزون
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
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movements ?? []).map((m: any) => (
                    <TableRow key={m.id} data-testid={`row-movement-${m.id}`}>
                      <TableCell className="font-medium">{productMap[m.productId] ?? `#${m.productId}`}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[m.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.type}
                        </span>
                      </TableCell>
                      <TableCell className={`font-semibold ${m.type === "out" ? "text-red-600" : "text-emerald-600"}`}>
                        {m.type === "out" ? "-" : "+"}{m.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{m.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.createdAt ? format(new Date(m.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!movements || movements.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No movements recorded</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adjust Stock / تعديل المخزون</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Product</Label>
              <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Quantity (+ to add, - to reduce)</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="h-8 text-sm" placeholder="e.g. 10 or -5" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="h-8 text-sm" placeholder="Reason for adjustment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={adjustInventory.isPending || !form.productId || !form.quantity} data-testid="button-save-adjustment">Apply / تطبيق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
