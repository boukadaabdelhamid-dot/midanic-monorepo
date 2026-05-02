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
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center bg-secondary/30 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply" />
          <img 
            src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=2000&auto=format&fit=crop" 
            alt="Luxury Beauty" 
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="container relative z-20 px-4 md:px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
          <Badge variant="outline" className="mb-6 bg-background/50 backdrop-blur border-primary/20 text-primary uppercase tracking-widest text-xs px-4 py-1.5 font-medium">
            {lang === 'ar' ? 'العلامة التجارية الفاخرة' : 'Premium Grooming'}
          </Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight mb-6 text-foreground drop-shadow-sm">
            {lang === 'ar' ? 'اكتشف أناقتك المميزة' : 'Discover Your Signature Elegance'}
          </h1>
          <p className="mt-4 text-lg md:text-2xl max-w-2xl mx-auto text-muted-foreground">
            {lang === 'ar' ? 'مستحضرات التجميل والعناية الفاخرة المصممة لنمط الحياة العصري في الشرق الأوسط.' : 'Premium beauty and grooming essentials curated for the modern Middle Eastern lifestyle.'}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/products">
              <Button size="lg" className="text-lg px-10 h-14 rounded-full" data-testid="button-shop-now">
                {lang === 'ar' ? 'تسوق الآن' : 'Shop Now'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-20 md:py-32 bg-background border-b border-border/40">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl font-serif font-bold tracking-tight">
              {lang === 'ar' ? 'تسوق حسب الفئة' : 'Shop by Category'}
            </h2>
            <div className="w-12 h-1 bg-primary mt-6 rounded-full opacity-60"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {isLoadingCats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-full" />
              ))
            ) : (
              categories?.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/products?categoryId=${category.id}`} className="group flex flex-col items-center gap-6" data-testid={`link-category-${category.id}`}>
                  <div className="w-36 h-36 md:w-56 md:h-56 rounded-full bg-secondary/30 flex items-center justify-center border border-border group-hover:border-primary/50 group-hover:bg-secondary/50 transition-all duration-500 overflow-hidden relative">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.nameEn} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <span className="text-5xl text-primary font-serif italic opacity-30">{category.nameEn.charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="font-serif text-xl group-hover:text-primary transition-colors">
                      {lang === 'ar' ? category.nameAr : category.nameEn}
                    </h3>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-serif font-bold tracking-tight">
                {lang === 'ar' ? 'المجموعة المميزة' : 'Featured Collection'}
              </h2>
            </div>
            <Link href="/products">
              <Button variant="link" className="hidden sm:flex text-lg hover:no-underline hover:text-primary/80">
                {lang === 'ar' ? 'عرض الكل' : 'View All'} &rarr;
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {isLoadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
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
          
          <div className="mt-12 sm:hidden flex justify-center">
            <Link href="/products">
              <Button variant="outline" className="w-full h-12 rounded-full text-lg">
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Inline Badge component since it wasn't imported
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) {
  return <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</span>;
}
