import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetCart, useCreateOrder, getGetCartQueryKey } from "@workspace/api-client-react";
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
    shippingAddress: "",
    phone: ""
  });

  const cartItems = cart ?? [];

  if (cartItems.length === 0) {
    setLocation("/cart");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const items = cartItems.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    createOrder.mutate(
      { 
        data: { 
          items, 
          shippingAddress: formData.shippingAddress, 
          phone: formData.phone,
          couponCode
        } 
      },
      {
        onSuccess: (order) => {
          queryClient.setQueryData(getGetCartQueryKey(), { items: [] });
          toast({ title: "Order Placed Successfully! / تم تقديم الطلب بنجاح!" });
          setLocation(`/orders/${order.id}`);
        },
        onError: (err: any) => {
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
            <Label htmlFor="phone">Phone Number / رقم الهاتف</Label>
            <Input 
              id="phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+966 50 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Shipping Address / عنوان التوصيل</Label>
            <Textarea 
              id="address"
              required
              rows={4}
              value={formData.shippingAddress}
              onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})}
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
