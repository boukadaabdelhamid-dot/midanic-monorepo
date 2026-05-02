import React from "react";
import { Link } from "wouter";
import { ShoppingBag, User, Menu, Globe } from "lucide-react";
import logoPath from "@assets/logo_des_13_midanic_1777739613232.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-lang";
import { useGetCart, getGetCartQueryKey, type CartItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLang();

  const { data: cart } = useGetCart({
    query: {
      enabled: !!user,
      queryKey: getGetCartQueryKey(),
    }
  });

  const cartCount = (Array.isArray(cart) ? cart : []).reduce(
    (acc: number, item: CartItem) => acc + item.quantity,
    0
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img src={logoPath} alt="Midanic Logo" className="h-8 w-auto" />
            <span className="font-serif font-bold text-xl tracking-tight hidden sm:inline-block">Midanic ميدانيك</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/products" className="text-sm font-medium transition-colors hover:text-primary">
              Products / المنتجات
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              About / من نحن
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={toggleLang} data-testid="button-toggle-lang">
            <Globe className="h-5 w-5" />
            <span className="sr-only">Toggle Language</span>
          </Button>

          <Link href="/cart" className="relative group">
            <Button variant="ghost" size="icon" data-testid="link-cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/orders">
                <Button variant="ghost" size="icon" data-testid="link-orders">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout" className="hidden md:flex">
                {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              </Button>
            </div>
          ) : (
            <Link href="/auth/login">
              <Button variant="default" size="sm" data-testid="link-login">
                {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
