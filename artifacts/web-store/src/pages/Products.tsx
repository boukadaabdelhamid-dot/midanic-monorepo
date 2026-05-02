import React, { useState } from "react";
import { useGetProducts, useGetCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useLocation } from "wouter";

export default function Products() {
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
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-serif font-bold mb-2">Our Collection</h1>
        <h1 className="text-4xl font-serif font-bold" dir="rtl">مجموعتنا</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 flex flex-col gap-6 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search / بحث..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-lg border-b pb-2">Categories / الفئات</h3>
            <div className="flex flex-col gap-2">
              <Button 
                variant={activeCategory === undefined ? "default" : "ghost"} 
                className="justify-start"
                onClick={() => setActiveCategory(undefined)}
              >
                All Products / جميع المنتجات
              </Button>
              {categories?.map(cat => (
                <Button 
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "ghost"} 
                  className="justify-start text-left flex-col items-start py-2 h-auto"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span>{cat.nameEn}</span>
                  <span dir="rtl" className="w-full mt-1 text-sm opacity-80">{cat.nameAr}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-[4/5] w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : productsRes?.products.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-lg">
              <p className="text-lg text-muted-foreground mb-2">No products found matching your criteria.</p>
              <p className="text-lg text-muted-foreground" dir="rtl">لم يتم العثور على منتجات تطابق معاييرك.</p>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => { setSearch(""); setActiveCategory(undefined); }}
              >
                Clear Filters / مسح الفلاتر
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
