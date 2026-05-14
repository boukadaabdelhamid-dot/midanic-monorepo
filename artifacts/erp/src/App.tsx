import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, forceLogout, useAuth } from "@/hooks/use-auth";
import { StoreProvider, useStoreContext } from "@/hooks/use-store";
import { useMe } from "@/hooks/use-me";
import { useRealtimeWS } from "@/hooks/use-realtime-ws";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import SelectStore from "@/pages/SelectStore";
import { useEffect, useRef } from "react";
import Stores from "@/pages/Stores";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import OnlineOrders from "@/pages/OnlineOrders";
import Products from "@/pages/Products";
import Employees from "@/pages/Employees";
import Attendance from "@/pages/Attendance";
import Leaves from "@/pages/Leaves";
import Suppliers from "@/pages/Suppliers";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Inventory from "@/pages/Inventory";
import Transfers from "@/pages/Transfers";
import Accounting from "@/pages/Accounting";
import Customers from "@/pages/Customers";
import Caisse from "@/pages/Caisse";
import CaisseReports from "@/pages/CaisseReports";
import RealTime from "@/pages/RealTime";
import Staff from "@/pages/Staff";

function is401(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 401
  );
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => { if (is401(error)) forceLogout(); },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !is401(error) && failureCount < 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { currentStoreId } = useStoreContext();
  const { isAdmin, isLoading, user } = useMe();
  if (isLoading) return <Layout><div className="p-6 text-sm text-muted-foreground">…</div></Layout>;
  const stores = (user as { stores?: unknown[] } | null)?.stores ?? [];
  if (!currentStoreId && stores.length > 0) return <Redirect to="/select-store" />;
  if (adminOnly && !isAdmin) return <Redirect to="/home" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function ProtectedHome() {
  const { currentStoreId } = useStoreContext();
  const { user, isLoading } = useMe();
  if (isLoading) return <Layout><div className="p-6 text-sm text-muted-foreground">…</div></Layout>;
  const stores = (user as { stores?: unknown[] } | null)?.stores ?? [];
  if (!currentStoreId && stores.length > 0) return <Redirect to="/select-store" />;
  return <Layout><Home /></Layout>;
}

function Router() {
  // Single WS connection scoped to the whole app — keeps transfer list,
  // order list, and inventory cache fresh in real time across pages.
  useRealtimeWS();

  return (
    <Switch>
      <Route path="/select-store" component={SelectStore} />
      <Route path="/">
        <Redirect to="/home" />
      </Route>
      <Route path="/stores">
        <ProtectedRoute component={Stores} adminOnly />
      </Route>
      <Route path="/home">
        <ProtectedHome />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} adminOnly />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={Orders} />
      </Route>
      <Route path="/online-orders">
        <ProtectedRoute component={OnlineOrders} />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={Products} />
      </Route>
      <Route path="/employees">
        <ProtectedRoute component={Employees} adminOnly />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={Attendance} adminOnly />
      </Route>
      <Route path="/leaves">
        <ProtectedRoute component={Leaves} adminOnly />
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute component={Suppliers} adminOnly />
      </Route>
      <Route path="/purchase-orders">
        <ProtectedRoute component={PurchaseOrders} adminOnly />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={Inventory} />
      </Route>
      <Route path="/transfers">
        <ProtectedRoute component={Transfers} />
      </Route>
      <Route path="/accounting">
        <ProtectedRoute component={Accounting} adminOnly />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={Customers} />
      </Route>
      <Route path="/staff">
        <ProtectedRoute component={Staff} adminOnly />
      </Route>
      <Route path="/caisse/reports">
        <ProtectedRoute component={CaisseReports} adminOnly />
      </Route>
      <Route path="/caisse">
        <ProtectedRoute component={Caisse} />
      </Route>
      <Route path="/realtime">
        <ProtectedRoute component={RealTime} adminOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

const ADMIN_EMAIL = "admin@midanic.com";
const ADMIN_PASS = "admin1234";
const STORE_KEY = "midanic.erp.currentStoreId";

function AutoLoginGate({ children }: { children: React.ReactNode }) {
  const { token, setToken } = useAuth();
  const qc = useQueryClient();
  const busy = useRef(false);

  const doLogin = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await fetch(`${base}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              setToken(data.token);
              if (data.stores?.length >= 1) {
                localStorage.setItem(STORE_KEY, String(data.stores[0].id));
              }
              qc.invalidateQueries();
              break;
            }
          }
        } catch {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (!token) doLogin();
    const handler = () => doLogin();
    window.addEventListener("midanic:relogin", handler);
    return () => window.removeEventListener("midanic:relogin", handler);
  }, [token]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AutoLoginGate>
          <StoreProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </StoreProvider>
        </AutoLoginGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
