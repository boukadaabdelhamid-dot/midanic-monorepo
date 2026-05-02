import React, { useState } from "react";
import {
  useGetPurchaseOrders, useCreatePurchaseOrder, useReceivePurchaseOrder,
  useGetSuppliers, useGetProducts,
  getGetPurchaseOrdersQueryKey
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
import { Plus, PackageCheck } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  ordered: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
};

type POItem = { productId: string; quantity: string; unitCost: string };

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const { data: pos, isLoading } = useGetPurchaseOrders();
  const { data: suppliers } = useGetSuppliers();
  const { data: productsRes } = useGetProducts();
  const createPO = useCreatePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [poItems, setPoItems] = useState<POItem[]>([{ productId: "", quantity: "1", unitCost: "" }]);

  const products = productsRes?.products ?? [];
  const supplierMap: Record<number, string> = {};
  (suppliers ?? []).forEach((s: any) => { supplierMap[s.id] = s.name; });

  const addItem = () => setPoItems((items) => [...items, { productId: "", quantity: "1", unitCost: "" }]);
  const removeItem = (idx: number) => setPoItems((items) => items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: keyof POItem, val: string) =>
    setPoItems((items) => items.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const handleSave = () => {
    const items = poItems.filter(i => i.productId && i.quantity).map(i => ({
      productId: parseInt(i.productId), quantity: parseInt(i.quantity), unitCost: parseFloat(i.unitCost) || 0
    }));
    createPO.mutate(
      { data: { supplierId: parseInt(supplierId), expectedDate, items } },
      { onSettled: () => { qc.invalidateQueries({ queryKey: getGetPurchaseOrdersQueryKey() }); setOpen(false); } }
    );
  };

  const handleReceive = (id: number) => {
    receivePO.mutate({ id }, { onSettled: () => qc.invalidateQueries({ queryKey: getGetPurchaseOrdersQueryKey() }) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders / أوامر الشراء</h1>
          <p className="text-sm text-muted-foreground">Manage procurement</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-add-po">
          <Plus className="h-4 w-4 mr-2" /> Create PO / إنشاء
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
                    <TableHead>PO #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pos ?? []).map((po: any) => (
                    <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                      <TableCell className="font-medium">#{po.id}</TableCell>
                      <TableCell>{supplierMap[po.supplierId] ?? `#${po.supplierId}`}</TableCell>
                      <TableCell className="font-semibold text-primary">SAR {po.totalAmount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {po.expectedDate ? format(new Date(po.expectedDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[po.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {po.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {po.status !== "received" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleReceive(po.id)} data-testid={`btn-receive-${po.id}`}>
                            <PackageCheck className="h-3 w-3 mr-1" /> Receive
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!pos || pos.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Purchase Order / إنشاء أمر شراء</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Expected Date</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Items</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addItem}>+ Add Item</Button>
              </div>
              <div className="space-y-2">
                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-5">
                      <Select value={item.productId} onValueChange={(v) => updateItem(idx, "productId", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.nameEn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input placeholder="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="col-span-3">
                      <Input placeholder="Cost" type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Button size="icon" variant="ghost" className="col-span-1 h-7 w-7 text-muted-foreground" onClick={() => removeItem(idx)}>×</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createPO.isPending || !supplierId} data-testid="button-save-po">Create / إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
