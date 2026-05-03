import React, { useState } from "react";
import {
  useGetAdminOrders, useUpdateOrderStatus, useGetOrder, getGetAdminOrdersQueryKey,
  getGetOrderQueryKey,
  GetAdminOrdersChannel,
  type Order, type UpdateOrderStatusRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Bell, Printer, ChevronDown, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import InvoiceDialog from "@/components/InvoiceDialog";
import type { InvoiceData } from "@/components/InvoiceTemplate";
import { useCurrentStore } from "@/hooks/use-current-store";

const STATUS_OPTIONS: UpdateOrderStatusRequestStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

const statusColor = (s: string) => {
  switch (s) {
    case "delivered": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "shipped": return "bg-blue-100 text-blue-700 border-blue-200";
    case "processing": return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancelled": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

/**
 * Expandable items panel — lazy-loads the full order (including items)
 * via `useGetOrder` only when the row is expanded, so the inbox list stays
 * cheap even with many orders.
 */
function OrderItemsRow({ orderId, colSpan }: { orderId: number; colSpan: number }) {
  const { data, isLoading } = useGetOrder(orderId, {
    query: { queryKey: getGetOrderQueryKey(orderId) },
  });
  const items = data?.items ?? [];
  return (
    <TableRow data-testid={`row-online-order-items-${orderId}`}>
      <TableCell colSpan={colSpan} className="bg-slate-50 p-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun article / لا توجد منتجات</div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Articles ({items.length}) / المنتجات
            </div>
            <ul className="text-sm space-y-1">
              {items.map((it, idx) => {
                const name = it.product?.nameEn || it.product?.nameAr || `Article #${it.product?.id ?? idx}`;
                const ref = it.product?.reference ?? it.product?.barcode ?? null;
                const qty = it.quantity ?? 0;
                const unit = parseFloat(it.unitPrice ?? "0");
                const lineTotal = (qty * unit).toFixed(2);
                return (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-3 px-2 py-1 rounded border bg-white"
                    data-testid={`order-item-${orderId}-${idx}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{name}</div>
                      {ref && <div className="text-xs text-muted-foreground truncate">{ref}</div>}
                    </div>
                    <div className="text-sm tabular-nums whitespace-nowrap">
                      {qty} × دج {unit.toFixed(2)} = <span className="font-semibold text-primary">دج {lineTotal}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function OnlineOrders() {
  const qc = useQueryClient();
  const params = { channel: GetAdminOrdersChannel.online };
  const { data: orders, isLoading } = useGetAdminOrders(params, {
    query: { queryKey: getGetAdminOrdersQueryKey(params) },
  });
  const updateStatus = useUpdateOrderStatus();
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);
  const [showTva, setShowTva] = useState(false);
  const store = useCurrentStore();
  const { data: invoiceOrder } = useGetOrder(invoiceOrderId ?? 0, {
    query: { enabled: !!invoiceOrderId, queryKey: getGetOrderQueryKey(invoiceOrderId ?? 0) },
  });

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openInvoice = (orderId: number) => {
    setShowTva(!!store?.showTvaByDefault);
    setInvoiceOrderId(orderId);
  };

  const invoiceData: InvoiceData | null = React.useMemo(() => {
    if (!invoiceOrder || !invoiceOrderId) return null;
    const items = invoiceOrder.items ?? [];
    return {
      kind: "sale",
      number: `FV-${String(invoiceOrder.id).padStart(6, "0")}`,
      date: invoiceOrder.createdAt ? new Date(invoiceOrder.createdAt) : new Date(),
      store,
      party: {
        name: invoiceOrder.customerName,
        address: invoiceOrder.customerAddress,
        phone: invoiceOrder.customerPhone,
      },
      lines: items.map((it) => ({
        designation: (it.product?.nameEn || it.product?.nameAr || "—").toUpperCase(),
        reference: it.product?.reference ?? it.product?.barcode ?? null,
        qty: it.quantity ?? 0,
        unitPrice: parseFloat(it.unitPrice ?? "0"),
      })),
      showTva,
      tvaRate: parseFloat(store?.tvaRate ?? "19"),
    };
  }, [invoiceOrder, invoiceOrderId, store, showTva]);

  const handleStatusChange = (id: number, status: UpdateOrderStatusRequestStatus) => {
    setUpdating(id);
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSettled: () => {
          setUpdating(null);
          qc.invalidateQueries({ queryKey: getGetAdminOrdersQueryKey(params) });
        },
      }
    );
  };

  const pendingCount = (orders ?? []).filter((o) => o.status === "pending").length;
  const COLS = 10;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-[#1B3057]" />
          Commandes en ligne / طلبات المتجر
        </h1>
        <p className="text-sm text-muted-foreground">
          Commandes reçues depuis le site et l'application mobile / الطلبات الواردة من الموقع والتطبيق
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Online Orders ({orders?.length ?? 0})</span>
            {pendingCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {pendingCount} pending / قيد الانتظار
              </span>
            )}
          </CardTitle>
        </CardHeader>
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
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status / الحالة</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders ?? []).map((order: Order) => {
                    const isOpen = expanded.has(order.id);
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow data-testid={`row-online-order-${order.id}`}>
                          <TableCell className="p-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => toggleExpand(order.id)}
                              aria-label={isOpen ? "Collapse items" : "Expand items"}
                              data-testid={`button-toggle-items-${order.id}`}
                            >
                              {isOpen
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                          <TableCell className="text-sm">{order.customerPhone}</TableCell>
                          <TableCell className="text-sm max-w-[220px] truncate" title={order.customerAddress}>
                            {order.customerAddress}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            دج {order.totalAmount}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.createdAt
                              ? format(new Date(order.createdAt), "MMM d, yyyy HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {order.createdAt
                              ? formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={order.status}
                              onValueChange={(v) => handleStatusChange(order.id, v as UpdateOrderStatusRequestStatus)}
                              disabled={updating === order.id}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs" data-testid={`select-online-status-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-8 text-xs"
                              onClick={() => openInvoice(order.id)}
                              title="Imprimer la facture (TVA réglable dans l'aperçu)"
                              data-testid={`button-online-invoice-${order.id}`}>
                              <Printer className="h-3.5 w-3.5 mr-1" /> Facture / فاتورة
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && <OrderItemsRow orderId={order.id} colSpan={COLS + 1} />}
                      </React.Fragment>
                    );
                  })}
                  {(!orders || orders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={COLS + 1} className="text-center py-8 text-muted-foreground">
                        Aucune commande en ligne pour le moment / لا توجد طلبات حتى الآن
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <InvoiceDialog
          open={!!invoiceOrderId}
          onOpenChange={(o) => { if (!o) setInvoiceOrderId(null); }}
          data={invoiceData}
          onShowTvaChange={setShowTva}
        />
      </Card>
    </div>
  );
}
