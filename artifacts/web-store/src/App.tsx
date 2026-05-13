import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LangProvider } from "@/hooks/use-lang";
import { useEffect } from "react";

import { Navbar } from "@/components/layout/Navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminCategories from "@/pages/admin/Categories";
import AdminOrders from "@/pages/admin/Orders";

const queryClient = new QueryClient();

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user?.role !== "admin") {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || user?.role !== "admin") return null;

  return <>{children}</>;
}

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/cart" component={Cart} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/orders" component={Orders} />
          <Route path="/orders/:id" component={OrderDetail} />
          
          <Route path="/admin">
            <AdminGuard><AdminDashboard /></AdminGuard>
          </Route>
          <Route path="/admin/products">
            <AdminGuard><AdminProducts /></AdminGuard>
          </Route>
          <Route path="/admin/categories">
            <AdminGuard><AdminCategories /></AdminGuard>
          </Route>
          <Route path="/admin/orders">
            <AdminGuard><AdminOrders /></AdminGuard>
          </Route>
          
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="border-t py-12 bg-card mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-serif text-xl font-bold mb-4 text-primary">Midanic ميدانيك</p>
          <p className="mb-2">© 2025 Midanic. All rights reserved.</p>
          <p dir="rtl">© 2025 ميدانيك. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LangProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LangProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
