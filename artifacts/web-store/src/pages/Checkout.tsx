import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetCart, useCreateOrder, getGetCartQueryKey, type CartItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const couponCode = searchParams.get("coupon") || undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cart } = useGetCart();
  const createOrder = useCreateOrder();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
  });

  const cartItems = (cart ?? []) as CartItem[];

  if (cartItems.length === 0) {
    setLocation("/cart");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const items = cartItems.map((item: CartItem) => ({
      productId: item.product?.id ?? item.id,
      quantity: item.quantity,
    }));

    createOrder.mutate(
      {
        data: {
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerAddress: formData.customerAddress,
          couponCode: couponCode ?? null,
          items,
        }
      },
      {
        onSuccess: (order) => {
          queryClient.setQueryData(getGetCartQueryKey(), []);
          toast({ title: "Order Placed Successfully! / تم تقديم الطلب بنجاح!" });
          setLocation(`/orders/${order.id}`);
        },
        onError: (err: Error) => {
          toast({ title: "Error / خطأ", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-serif font-bold mb-2">Checkout</h1>
      <h1 className="text-3xl font-serif font-bold mb-8" dir="rtl">إتمام الطلب</h1>

      <div className="bg-card border rounded-lg p-6 shadow-sm mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name / الاسم الكامل</Label>
            <Input
              id="customerName"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number / رقم الهاتف</Label>
            <Input
              id="customerPhone"
              required
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="+966 50 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress">Shipping Address / عنوان التوصيل</Label>
            <Textarea
              id="customerAddress"
              required
              rows={4}
              value={formData.customerAddress}
              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              placeholder="City, District, Street, Building..."
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={createOrder.isPending}
              data-testid="button-place-order"
            >
              {createOrder.isPending ? 'Processing...' : 'Place Order / تأكيد الطلب'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
