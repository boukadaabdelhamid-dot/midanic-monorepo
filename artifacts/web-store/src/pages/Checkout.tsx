import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetCart,
  useCreateOrder,
  getGetCartQueryKey,
  type CartItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/hooks/use-lang";
import {
  CreditCard,
  ShieldCheck,
  Banknote,
  Lock,
  ArrowLeft,
} from "lucide-react";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

function getApiBase(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/api` : "/api";
}

async function fetchCreatePaymentIntent(
  orderId: number
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const token = localStorage.getItem("midanic_token");
  const res = await fetch(`${getApiBase()}/payments/create-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? "Failed to create payment intent"
    );
  }
  return res.json();
}

interface StripePayFormProps {
  clientSecret: string;
  orderId: number;
  onSuccess: () => void;
  onBack: () => void;
  lang: string;
}

function StripePayForm({
  clientSecret,
  orderId,
  onSuccess,
  onBack,
  lang,
}: StripePayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}?payment=success`,
        },
        redirect: "if_required",
      });
      if (error) {
        toast({
          title: lang === "ar" ? "فشل الدفع" : "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: lang === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!",
        });
        onSuccess();
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <PaymentElement
        options={{ layout: "tabs" }}
      />
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          disabled={paying}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {lang === "ar" ? "رجوع" : "Back"}
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12"
          disabled={!stripe || paying}
        >
          <Lock className="mr-2 h-4 w-4" />
          {paying
            ? lang === "ar"
              ? "جاري الدفع..."
              : "Processing..."
            : lang === "ar"
              ? "ادفع الآن"
              : "Pay Now"}
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        {lang === "ar"
          ? "مدفوعاتك مشفرة وآمنة عبر Stripe"
          : "Your payment is encrypted and secured by Stripe"}
      </p>
    </form>
  );
}

type Step = "form" | "payment";
type PaymentMethod = "cod" | "card";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const couponCode = searchParams.get("coupon") || undefined;
  const { toast } = useToast();
  const { lang } = useLang();
  const queryClient = useQueryClient();

  const { data: cart } = useGetCart();
  const createOrder = useCreateOrder();

  const [step, setStep] = useState<Step>("form");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);

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

  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum + parseFloat(item.product?.price ?? "0") * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingProduct = cartItems.find((item: CartItem) => !item.product?.id);
    if (missingProduct) {
      toast({
        title: lang === "ar" ? "خطأ" : "Error",
        description:
          "One or more cart items are missing product information. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const items = cartItems.map((item: CartItem) => ({
      productId: item.product!.id as number,
      quantity: item.quantity,
    }));

    createOrder.mutate(
      {
        data: {
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerAddress: formData.customerAddress,
          couponCode: couponCode || null,
          items,
        },
      },
      {
        onSuccess: async (order) => {
          queryClient.setQueryData(getGetCartQueryKey(), []);
          setOrderId(order.id);

          if (paymentMethod === "cod") {
            toast({
              title:
                lang === "ar"
                  ? "تم تقديم الطلب بنجاح!"
                  : "Order Placed Successfully!",
            });
            setLocation(`/orders/${order.id}`);
            return;
          }

          // Card payment: create PaymentIntent and show Stripe Elements
          setCreatingIntent(true);
          try {
            const intent = await fetchCreatePaymentIntent(order.id);
            setClientSecret(intent.clientSecret);
            setStep("payment");
          } catch (err) {
            toast({
              title: lang === "ar" ? "خطأ في الدفع" : "Payment Error",
              description: (err as Error).message,
              variant: "destructive",
            });
            // Still redirect — order was created (COD fallback)
            setLocation(`/orders/${order.id}`);
          } finally {
            setCreatingIntent(false);
          }
        },
        onError: (err: Error) => {
          toast({
            title: lang === "ar" ? "خطأ" : "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handlePaymentSuccess = () => {
    setLocation(`/orders/${orderId}?payment=success`);
  };

  const isProcessing =
    createOrder.isPending || creatingIntent;

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <h1
          className="text-4xl md:text-5xl font-serif font-bold mb-12 text-center"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {lang === "ar" ? "إتمام الطلب" : "Checkout"}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left column */}
          <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1">
            <div className="bg-card border rounded-2xl p-6 md:p-10 shadow-sm">
              {step === "form" && (
                <>
                  <h2
                    className="text-2xl font-serif font-bold mb-8 pb-4 border-b"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  >
                    {lang === "ar" ? "معلومات التوصيل" : "Shipping Information"}
                  </h2>

                  <form
                    id="checkout-form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="text-sm font-semibold">
                        {lang === "ar" ? "الاسم الكامل" : "Full Name"}
                      </Label>
                      <Input
                        id="customerName"
                        required
                        value={formData.customerName}
                        onChange={(e) =>
                          setFormData({ ...formData, customerName: e.target.value })
                        }
                        placeholder={
                          lang === "ar" ? "أدخل اسمك الكامل" : "Your full name"
                        }
                        className="h-12 bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerPhone" className="text-sm font-semibold">
                        {lang === "ar" ? "رقم الهاتف" : "Phone Number"}
                      </Label>
                      <Input
                        id="customerPhone"
                        required
                        value={formData.customerPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, customerPhone: e.target.value })
                        }
                        placeholder="+966 5X XXX XXXX"
                        className="h-12 bg-background text-left"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="customerAddress"
                        className="text-sm font-semibold"
                      >
                        {lang === "ar"
                          ? "عنوان التوصيل التفصيلي"
                          : "Detailed Shipping Address"}
                      </Label>
                      <Textarea
                        id="customerAddress"
                        required
                        rows={4}
                        value={formData.customerAddress}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customerAddress: e.target.value,
                          })
                        }
                        placeholder={
                          lang === "ar"
                            ? "المدينة، الحي، الشارع، رقم المبنى..."
                            : "City, District, Street, Building..."
                        }
                        className="resize-none bg-background p-4"
                      />
                    </div>

                    {/* Payment Method Selection */}
                    <div className="pt-2">
                      <p className="text-sm font-semibold mb-3">
                        {lang === "ar" ? "طريقة الدفع" : "Payment Method"}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Cash on Delivery */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cod")}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                            paymentMethod === "cod"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          <Banknote
                            className={`h-5 w-5 mt-0.5 shrink-0 ${
                              paymentMethod === "cod"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-sm">
                              {lang === "ar" ? "الدفع عند الاستلام" : "Cash on Delivery"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lang === "ar"
                                ? "ادفع نقداً عند وصول طلبك"
                                : "Pay cash when your order arrives"}
                            </p>
                          </div>
                        </button>

                        {/* Pay with Card */}
                        {stripePromise ? (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("card")}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              paymentMethod === "card"
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <CreditCard
                              className={`h-5 w-5 mt-0.5 shrink-0 ${
                                paymentMethod === "card"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div>
                              <p className="font-semibold text-sm">
                                {lang === "ar"
                                  ? "الدفع بالبطاقة البنكية"
                                  : "Pay with Card"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {lang === "ar"
                                  ? "Visa، Mastercard، وغيرها"
                                  : "Visa, Mastercard & more"}
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 text-left opacity-60 cursor-not-allowed">
                            <CreditCard className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-sm text-muted-foreground">
                                {lang === "ar"
                                  ? "الدفع بالبطاقة"
                                  : "Card Payment"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {lang === "ar"
                                  ? "غير متاح حالياً"
                                  : "Coming soon"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </>
              )}

              {step === "payment" && clientSecret && stripePromise && (
                <>
                  <h2
                    className="text-2xl font-serif font-bold mb-8 pb-4 border-b"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  >
                    {lang === "ar" ? "تفاصيل البطاقة" : "Card Details"}
                  </h2>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#1B3057",
                          fontFamily: "Inter, system-ui, sans-serif",
                        },
                      },
                    }}
                  >
                    <StripePayForm
                      clientSecret={clientSecret}
                      orderId={orderId!}
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setStep("form")}
                      lang={lang}
                    />
                  </Elements>
                </>
              )}
            </div>
          </div>

          {/* Right column — Order Summary */}
          <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="bg-muted/10 border rounded-2xl p-6 md:p-8 sticky top-24">
              <h2
                className="text-xl font-serif font-bold mb-6 pb-4 border-b"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {lang === "ar" ? "ملخص الطلب" : "Order Summary"}
              </h2>

              <div
                className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-white rounded-md border flex items-center justify-center shrink-0 p-1">
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {lang === "ar"
                          ? item.product?.nameAr
                          : item.product?.nameEn}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {item.quantity} x SAR {item.product?.price}
                      </p>
                    </div>
                    <div className="font-bold text-sm shrink-0">
                      SAR{" "}
                      {(
                        parseFloat(item.product?.price ?? "0") * item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="space-y-3 pt-6 border-t text-sm mb-6"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span>SAR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{lang === "ar" ? "التوصيل" : "Shipping"}</span>
                  <span className="text-green-600 font-medium">
                    {lang === "ar" ? "مجاني" : "Free"}
                  </span>
                </div>
                {couponCode && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {lang === "ar" ? "كود الخصم المطبق" : "Coupon Applied"}
                    </span>
                    <span className="uppercase text-xs border border-green-200 bg-green-50 px-2 rounded-full py-0.5">
                      {couponCode}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-4 border-t mt-4 text-primary">
                  <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
                  <span>SAR {subtotal.toFixed(2)}</span>
                </div>
              </div>

              {step === "form" && (
                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full h-14 text-lg rounded-full shadow-md"
                  disabled={isProcessing}
                  data-testid="button-place-order"
                >
                  {isProcessing ? (
                    lang === "ar" ? "جاري التأكيد..." : "Processing..."
                  ) : paymentMethod === "card" ? (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      {lang === "ar" ? "متابعة للدفع" : "Continue to Payment"}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      {lang === "ar" ? "تأكيد الطلب" : "Place Order"}
                    </>
                  )}
                </Button>
              )}

              <p
                className="text-xs text-center text-muted-foreground mt-4"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {lang === "ar"
                  ? 'بالنقر على "تأكيد الطلب"، فإنك توافق على الشروط والأحكام الخاصة بنا.'
                  : 'By placing your order, you agree to our Terms & Conditions.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
