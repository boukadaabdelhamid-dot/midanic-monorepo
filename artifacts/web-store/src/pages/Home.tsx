import React from "react";
import { Link } from "wouter";
import { useGetProducts, useGetCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/hooks/use-lang";

export default function Home() {
  const { lang } = useLang();
  const { data: productsRes, isLoading: isLoadingProducts } = useGetProducts({ limit: 8 });
  const { data: categories, isLoading: isLoadingCats } = useGetCategories();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex items-center justify-center bg-secondary/30 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 z-10 mix-blend-multiply" />
          <img 
            src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=2000&auto=format&fit=crop" 
            alt="Luxury Beauty" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative z-20 px-4 md:px-6 text-center text-primary-foreground max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight mb-4 drop-shadow-md">
            Discover Your Signature Elegance
            <span className="block mt-4" dir="rtl">اكتشف أناقتك المميزة</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto opacity-90 drop-shadow">
            Premium beauty and grooming essentials curated for the modern Middle Eastern lifestyle.
            <span className="block mt-2" dir="rtl">مستحضرات التجميل والعناية الفاخرة المصممة لنمط الحياة العصري في الشرق الأوسط.</span>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/products">
              <Button size="lg" className="text-lg px-8 h-14" data-testid="button-shop-now">
                Shop Now / تسوق الآن
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl font-serif font-bold tracking-tight">Shop by Category</h2>
            <h2 className="text-3xl font-serif font-bold tracking-tight mt-2" dir="rtl">تسوق حسب الفئة</h2>
            <div className="w-16 h-1 bg-primary mt-6 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {isLoadingCats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-full" />
              ))
            ) : (
              categories?.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/products?categoryId=${category.id}`} className="group flex flex-col items-center gap-4">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-secondary/50 flex items-center justify-center border border-border group-hover:border-primary transition-colors overflow-hidden">
                    <span className="text-4xl text-primary font-serif italic opacity-30">{category.nameEn.charAt(0)}</span>
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium text-lg group-hover:text-primary transition-colors">{category.nameEn}</h3>
                    <h3 className="font-medium text-lg group-hover:text-primary transition-colors" dir="rtl">{category.nameAr}</h3>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-serif font-bold tracking-tight">Featured Collection</h2>
              <h2 className="text-3xl font-serif font-bold tracking-tight mt-2" dir="rtl">المجموعة المميزة</h2>
            </div>
            <Link href="/products">
              <Button variant="ghost" className="hidden sm:flex">View All / عرض الكل</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[4/5] w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : (
              productsRes?.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
          
          <div className="mt-10 sm:hidden flex justify-center">
            <Link href="/products">
              <Button variant="outline" className="w-full">View All / عرض الكل</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
