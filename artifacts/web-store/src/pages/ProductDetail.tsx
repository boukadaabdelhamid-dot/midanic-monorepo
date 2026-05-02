import React, { useState } from "react";
import { useRoute } from "wouter";
import { 
  useGetProduct, 
  useAddToCart, 
  useCreateReview,
  getGetCartQueryKey,
  getGetProductQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Star, ShoppingCart, Minus, Plus } from "lucide-react";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: product, isLoading } = useGetProduct(productId, {
    query: {
      enabled: !!productId,
      queryKey: getGetProductQueryKey(productId)
    }
  });

  const addToCart = useAddToCart();
  const createReview = useCreateReview();

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add items to your cart. / يرجى تسجيل الدخول لإضافة منتجات إلى سلة التسوق الخاصة بك.",
        variant: "destructive"
      });
      return;
    }

    addToCart.mutate(
      { data: { productId, quantity } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({
            title: "Added to Cart / تمت الإضافة إلى السلة",
            description: `${quantity}x ${product?.nameEn} added to your cart.`
          });
        },
        onError: (err: any) => {
          toast({
            title: "Error / خطأ",
            description: err.message || "Could not add to cart",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    if (!reviewComment.trim()) return;

    createReview.mutate(
      { id: productId, data: { rating: reviewRating, comment: reviewComment } },
      {
        onSuccess: () => {
          setReviewComment("");
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
          toast({ title: "Review Added / تمت إضافة التقييم" });
        },
        onError: (err: any) => {
          toast({ title: "Error / خطأ", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-20">Product not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-16">
        {/* Product Image */}
        <div className="bg-muted/30 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.nameEn} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground">No image</span>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 text-primary">{product.nameEn}</h1>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-primary" dir="rtl">{product.nameAr}</h1>
          
          <div className="text-2xl font-semibold mb-6">SAR {product.price}</div>

          <div className="mb-6 space-y-4 text-muted-foreground leading-relaxed">
            <p>{product.descriptionEn}</p>
            <p dir="rtl" className="text-right">{product.descriptionAr}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-medium">Quantity / الكمية:</span>
              <div className="flex items-center border rounded-md">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                  disabled={quantity >= (product.stock || 99)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {product.stock !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {product.stock > 0 ? `${product.stock} available / متوفر` : 'Out of stock / نفذت الكمية'}
                </span>
              )}
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full md:w-auto mt-auto text-lg h-14"
            disabled={product.stock === 0 || addToCart.isPending}
            onClick={handleAddToCart}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {addToCart.isPending ? 'Adding... / جاري الإضافة...' : 'Add to Cart / أضف إلى السلة'}
          </Button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t pt-12">
        <h2 className="text-2xl font-serif font-bold mb-8">Reviews / التقييمات</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Review List */}
          <div className="lg:col-span-2 space-y-6">
            {!product.reviews || product.reviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product! / لا توجد تقييمات بعد. كن أول من يقيم هذا المنتج!</p>
            ) : (
              product.reviews.map((review: any) => (
                <div key={review.id} className="border-b pb-6 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-secondary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-muted'}`} />
                      ))}
                    </div>
                    <span className="font-medium">{review.user?.name || 'Anonymous'}</span>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Review Form */}
          <div className="bg-muted/30 p-6 rounded-lg h-fit">
            <h3 className="text-lg font-semibold mb-4">Write a Review / اكتب تقييماً</h3>
            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rating / التقييم</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i + 1)}
                        className="focus:outline-none"
                      >
                        <Star className={`h-6 w-6 ${i < reviewRating ? 'fill-secondary text-secondary' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Comment / تعليق</label>
                  <Textarea 
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your thoughts... / شاركنا رأيك..."
                    rows={4}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createReview.isPending || !reviewComment.trim()}
                >
                  {createReview.isPending ? 'Submitting... / جاري التقديم...' : 'Submit Review / إرسال التقييم'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="mb-4 text-sm text-muted-foreground">Please login to write a review. / يرجى تسجيل الدخول لكتابة تقييم.</p>
                <Button variant="outline" onClick={() => window.location.href = '/auth/login'}>
                  Login / تسجيل الدخول
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
