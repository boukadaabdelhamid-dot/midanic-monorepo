import React, { useState } from "react";
import {
  useGetAdminOrders, useUpdateOrderStatus, getGetAdminOrdersQueryKey,
  type Order, type UpdateOrderStatusRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, History } from "lucide-react";
import { format } from "date-fns";
import Pos from "./Pos";

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

export default function Orders() {
  const [tab, setTab] = useState<"vente" | "historique">("vente");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-[#1B3057]" />
          Ventes / المبيعات
        </h1>
        <p className="text-sm text-muted-foreground">
          Point de vente et historique des commandes / نقطة البيع وسجل الطلبات
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "vente" | "historique")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="vente" data-testid="tab-vente">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Nouvelle vente / بيع جديد
          </TabsTrigger>
          <TabsTrigger value="historique" data-testid="tab-historique">
            <History className="h-4 w-4 mr-2" />
            Historique / السجل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vente" className="mt-4">
          <Pos />
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          <OrdersHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrdersHistory() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useGetAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const [updating, setUpdating] = useState<number | null>(null);

  const handleStatusChange = (id: number, status: UpdateOrderStatusRequestStatus) => {
    setUpdating(id);
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSettled: () => {
          setUpdating(null);
          qc.invalidateQueries({ queryKey: getGetAdminOrdersQueryKey() });
        },
      }
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">All Orders ({orders?.length ?? 0})</CardTitle>
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
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendeur / البائع</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status / الحالة</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((order: Order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                    <TableCell className="text-sm">
                      {order.sellerUser?.name || order.sellerUser?.email || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      دج {order.totalAmount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.createdAt
                        ? format(new Date(order.createdAt), "MMM d, yyyy")
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
                        <SelectTrigger className="h-8 w-36 text-xs" data-testid={`select-status-${order.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {(!orders || orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
