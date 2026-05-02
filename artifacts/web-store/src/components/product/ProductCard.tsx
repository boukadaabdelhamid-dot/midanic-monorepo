import React from "react";
import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="group block" data-testid={`card-product-${product.id}`}>
      <Card className="overflow-hidden border-border/50 hover:border-primary/50 transition-colors h-full flex flex-col bg-card hover-elevate">
        <div className="aspect-[4/5] relative overflow-hidden bg-muted/30">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.nameEn || product.nameAr} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-muted-foreground">
              No Image
            </div>
          )}
          {product.stock && product.stock < 5 && product.stock > 0 && (
            <Badge variant="secondary" className="absolute top-2 right-2 bg-secondary text-secondary-foreground">
              Low Stock / كمية قليلة
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Out of Stock / نفذت الكمية
            </Badge>
          )}
        </div>
        <CardContent className="p-4 flex flex-col flex-grow">
          <div className="flex-grow">
            <h3 className="font-serif font-semibold text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">
              {product.nameEn}
            </h3>
            <h3 className="font-serif font-semibold text-lg line-clamp-1 mb-2 text-right group-hover:text-primary transition-colors" dir="rtl">
              {product.nameAr}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
              {product.descriptionEn?.slice(0, 80)}...
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-medium text-lg text-primary">
              SAR {product.price}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
