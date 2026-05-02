import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetCart, 
  useUpdateCartItem, 
  useRemoveFromCart,
  useValidateCoupon,
  getGetCartQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<{ type: string, value: number } | null>(null);

  const { data: cart, isLoading } = useGetCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const validateCoupon = useValidateCoupon();

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateItem.mutate(
      { id: productId, data: { quantity: newQuantity } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  };

  const handleRemove = (productId: number) => {
    removeItem.mutate(
      { id: productId },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    validateCoupon.mutate(
      { data: { code: couponCode } },
      {
        onSuccess: (res) => {
          if (res.valid) {
            setDiscount({ type: res.discountType!, value: res.discountValue! });
            toast({ title: "Coupon Applied / تم تطبيق الكوبون" });
          } else {
            setDiscount(null);
            toast({ title: "Invalid Coupon / كوبون غير صالح", description: res.message, variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Error validating coupon", variant: "destructive" })
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const items = cart ?? [];

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center flex flex-col items-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h2>
        <h2 className="text-2xl font-serif font-bold mb-6" dir="rtl">سلة التسوق فارغة</h2>
        <Link href="/products">
          <Button size="lg">Continue Shopping / مواصلة التسوق</Button>
        </Link>
      </div>
    );
  }

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }
  }
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl font-serif font-bold mb-2">Shopping Cart</h1>
      <h1 className="text-3xl font-serif font-bold mb-8" dir="rtl">سلة التسوق</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => (
            <div key={item.productId} className="flex gap-4 p-4 bg-card border rounded-lg shadow-sm">
              <div className="w-24 h-24 bg-muted/50 rounded-md overflow-hidden shrink-0">
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product.nameEn} className="w-full h-full object-cover" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight line-clamp-1">{item.product.nameEn}</h3>
                    <h3 className="font-semibold text-lg leading-tight line-clamp-1" dir="rtl">{item.product.nameAr}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(item.productId)}
                    disabled={removeItem.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div className="flex items-center border rounded-md bg-background">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updateItem.isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                      disabled={updateItem.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-semibold text-primary">SAR {(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-muted/20 p-6 rounded-lg border h-fit space-y-6">
          <h2 className="text-xl font-bold border-b pb-4">Order Summary / ملخص الطلب</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal / المجموع الفرعي</span>
              <span>SAR {subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount / الخصم</span>
                <span>- SAR {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total / الإجمالي</span>
              <span className="text-primary">SAR {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-sm font-medium">Coupon Code / كود الخصم</label>
            <div className="flex gap-2">
              <Input 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)} 
                placeholder="Enter code" 
                className="bg-background"
              />
              <Button 
                variant="secondary" 
                onClick={handleApplyCoupon}
                disabled={validateCoupon.isPending || !couponCode}
              >
                Apply
              </Button>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg mt-6" 
            onClick={() => setLocation(`/checkout?coupon=${couponCode}`)}
            data-testid="button-checkout"
          >
            Checkout / إتمام الطلب
          </Button>
        </div>
      </div>
    </div>
  );
}
