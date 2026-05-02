import React from "react";
import { Link } from "wouter";
import { useGetMyOrders } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Orders() {
  const { data: orders, isLoading } = useGetMyOrders();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <h1 className="text-3xl font-serif font-bold mb-2">My Orders</h1>
      <h1 className="text-3xl font-serif font-bold mb-8" dir="rtl">طلباتي</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-lg text-muted-foreground mb-4">You haven't placed any orders yet. / لم تقم بأي طلبات بعد.</p>
          <Link href="/products" className="text-primary hover:underline">
            Start Shopping / ابدأ التسوق
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="block group">
              <div className="bg-card border rounded-lg p-6 shadow-sm hover:border-primary transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="font-semibold text-lg mb-1">Order #{order.id} / طلب رقم {order.id}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="font-bold text-lg text-primary">SAR {order.totalAmount}</div>
                  <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
