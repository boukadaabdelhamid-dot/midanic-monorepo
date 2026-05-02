import React from "react";
import { useRoute } from "wouter";
import { useGetOrder, getGetOrderQueryKey, type OrderDetailItemsItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const orderId = Number(params?.id);

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId)
    }
  });

  if (isLoading) return <div className="container p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Order #{order.id}</h1>
          <h1 className="text-xl font-serif font-bold text-muted-foreground" dir="rtl">طلب رقم {order.id}</h1>
          {order.createdAt && (
            <p className="text-muted-foreground mt-2">{format(new Date(order.createdAt), "PPP")}</p>
          )}
        </div>
        <Badge className="capitalize text-sm px-3 py-1">{order.status}</Badge>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden mb-8 shadow-sm">
        <div className="p-4 bg-muted/30 border-b font-semibold">Items / العناصر</div>
        <div className="divide-y">
          {order.items?.map((item: OrderDetailItemsItem, idx: number) => (
            <div key={idx} className="p-4 flex gap-4 items-center">
              <div className="w-16 h-16 bg-muted rounded overflow-hidden shrink-0">
                {item.product?.imageUrl && (
                  <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium line-clamp-1">{item.product?.nameEn}</div>
                <div className="font-medium line-clamp-1 text-sm text-muted-foreground" dir="rtl">{item.product?.nameAr}</div>
                <div className="text-sm mt-1">Qty: {item.quantity ?? 0}</div>
              </div>
              <div className="font-bold">
                SAR {(parseFloat(item.unitPrice ?? "0") * (item.quantity ?? 0)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-muted/10 border-t flex justify-between items-center font-bold text-lg">
          <span>Total / الإجمالي</span>
          <span className="text-primary">SAR {order.totalAmount}</span>
        </div>
      </div>
    </div>
  );
}
