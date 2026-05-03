import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, forceLogout } from "@/hooks/use-auth";
import { StoreProvider, useStoreContext } from "@/hooks/use-store";
import { useMe } from "@/hooks/use-me";
import { useRealtimeWS } from "@/hooks/use-realtime-ws";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import SelectStore from "@/pages/SelectStore";
import Stores from "@/pages/Stores";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
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
  const { token } = useAuth();
  const { currentStoreId } = useStoreContext();
  const { isAdmin, isLoading, user } = useMe();
  if (!token) return <Redirect to="/login" />;
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
  const { token } = useAuth();
  const { currentStoreId } = useStoreContext();
  const { user, isLoading } = useMe();
  if (!token) return <Redirect to="/login" />;
  if (isLoading) return <Layout><div className="p-6 text-sm text-muted-foreground">…</div></Layout>;
  const stores = (user as { stores?: unknown[] } | null)?.stores ?? [];
  if (!currentStoreId && stores.length > 0) return <Redirect to="/select-store" />;
  return <Layout><Home /></Layout>;
}

function Router() {
  const { token } = useAuth();
  // Single WS connection scoped to the whole app — keeps transfer list,
  // order list, and inventory cache fresh in real time across pages.
  useRealtimeWS();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/select-store" component={SelectStore} />
      <Route path="/">
        {token ? <Redirect to="/home" /> : <Redirect to="/login" />}
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoreProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
