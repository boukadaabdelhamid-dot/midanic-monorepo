import React, { useState } from "react";
import { useGetProducts, useGetCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";
import { useLang } from "@/hooks/use-lang";

export default function Products() {
  const { lang } = useLang();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const initialCategory = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;
  
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | undefined>(initialCategory);
  
  const { data: categories } = useGetCategories();
  const { data: productsRes, isLoading } = useGetProducts({ 
    search: search || undefined,
    categoryId: activeCategory,
    limit: 24
  });

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mb-16 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
          {lang === 'ar' ? 'مجموعتنا' : 'Our Collection'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {lang === 'ar' ? 'تصفح مجموعتنا المختارة بعناية من منتجات العناية والجمال الفاخرة.' : 'Browse our carefully curated selection of premium beauty and grooming essentials.'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 flex flex-col gap-8 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder={lang === 'ar' ? "بحث..." : "Search..."} 
              className="pl-10 h-12 bg-background border-border/60 focus-visible:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-serif font-semibold text-lg">
                {lang === 'ar' ? 'الفئات' : 'Categories'}
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              <Button 
                variant={activeCategory === undefined ? "secondary" : "ghost"} 
                className={`justify-start font-medium ${activeCategory === undefined ? 'bg-secondary/50' : ''}`}
                onClick={() => setActiveCategory(undefined)}
                data-testid="btn-category-all"
              >
                {lang === 'ar' ? 'جميع المنتجات' : 'All Products'}
              </Button>
              {categories?.map(cat => (
                <Button 
                  key={cat.id}
                  variant={activeCategory === cat.id ? "secondary" : "ghost"} 
                  className={`justify-start font-medium text-left ${activeCategory === cat.id ? 'bg-secondary/50 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveCategory(cat.id)}
                  data-testid={`btn-category-${cat.id}`}
                >
                  <span dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : productsRes?.products.length === 0 ? (
            <div className="text-center py-32 bg-muted/20 border border-border/40 rounded-xl flex flex-col items-center justify-center">
              <p className="text-xl text-muted-foreground font-serif mb-6">
                {lang === 'ar' ? 'لم يتم العثور على منتجات تطابق بحثك.' : 'No products found matching your criteria.'}
              </p>
              <Button 
                variant="outline" 
                size="lg"
                className="rounded-full px-8"
                onClick={() => { setSearch(""); setActiveCategory(undefined); }}
              >
                {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {productsRes?.products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
