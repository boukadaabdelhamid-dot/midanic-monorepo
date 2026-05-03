import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Clock,
  Calendar, Truck, FileText, BarChart2, CreditCard,
  UserCheck, LogOut, Menu, X, Wallet, Activity, Home,
  ChevronLeft, ChevronRight, Store as StoreIcon, Check,
  ArrowLeftRight, Bell, Volume2, VolumeX,
} from "lucide-react";
import { Shield } from "lucide-react";
import logoPath from "@assets/logo_des_13_midanic_1777739613232.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-me";
import { useStoreContext } from "@/hooks/use-store";
import {
  useSelectStore, useGetAdminOrders, getGetAdminOrdersQueryKey,
  GetAdminOrdersChannel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isChimeMuted, setChimeMuted, playNewOrderChime } from "@/lib/chime";

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelEn: string;
  labelAr: string;
  adminOnly?: boolean;
  /** Optional badge key for live counters (e.g. pending online orders). */
  badge?: "online-orders-pending";
};

const navItems: NavItem[] = [
  { href: "/home", icon: Home, labelEn: "Home", labelAr: "الرئيسية" },
  { href: "/dashboard", icon: LayoutDashboard, labelEn: "Dashboard", labelAr: "لوحة التحكم", adminOnly: true },
  { href: "/realtime", icon: Activity, labelEn: "Temps Réel", labelAr: "الوقت الفعلي", adminOnly: true },
  { href: "/caisse", icon: Wallet, labelEn: "Caisses", labelAr: "الصناديق" },
  { href: "/caisse/reports", icon: BarChart2, labelEn: "Rapport caisses", labelAr: "تقرير الصناديق", adminOnly: true },
  { href: "/orders", icon: ShoppingCart, labelEn: "Ventes", labelAr: "المبيعات" },
  { href: "/online-orders", icon: Bell, labelEn: "Commandes en ligne", labelAr: "طلبات المتجر", badge: "online-orders-pending" },
  { href: "/products", icon: Package, labelEn: "Articles", labelAr: "المنتجات" },
  { href: "/purchase-orders", icon: FileText, labelEn: "Achats", labelAr: "المشتريات", adminOnly: true },
  { href: "/inventory", icon: BarChart2, labelEn: "Stock", labelAr: "المخزون" },
  { href: "/transfers", icon: ArrowLeftRight, labelEn: "Transferts", labelAr: "التحويلات" },
  { href: "/customers", icon: UserCheck, labelEn: "Clients", labelAr: "العملاء" },
  { href: "/suppliers", icon: Truck, labelEn: "Fournisseurs", labelAr: "الموردون", adminOnly: true },
  { href: "/employees", icon: Users, labelEn: "Employés", labelAr: "الموظفون", adminOnly: true },
  { href: "/staff", icon: Shield, labelEn: "Accès / Staff", labelAr: "الصلاحيات", adminOnly: true },
  { href: "/stores", icon: StoreIcon, labelEn: "Magasins", labelAr: "المتاجر", adminOnly: true },
  { href: "/attendance", icon: Clock, labelEn: "Présences", labelAr: "الحضور", adminOnly: true },
  { href: "/leaves", icon: Calendar, labelEn: "Congés", labelAr: "الإجازات", adminOnly: true },
  { href: "/accounting", icon: CreditCard, labelEn: "Comptabilité", labelAr: "المحاسبة", adminOnly: true },
];

const COLLAPSE_KEY = "midanic.erp.sidebarCollapsed";

function StoreSwitcher({ collapsed }: { collapsed: boolean }) {
  const { user } = useMe();
  const { currentStoreId, stores: ctxStores, setStores, setCurrentStoreId } = useStoreContext();
  const { setToken } = useAuth();
  const qc = useQueryClient();
  const selectStore = useSelectStore();
  const [open, setOpen] = useState(false);

  const userStores = (user as { stores?: Array<{ id: number; nameAr: string; nameEn: string; slug: string }> } | null)?.stores ?? [];
  const stores = ctxStores.length > 0 ? ctxStores : userStores;
  // Hydrate context from /auth/me on first load (e.g., page refresh) so the
  // switcher works even before another login event populates context.
  useEffect(() => {
    if (ctxStores.length === 0 && userStores.length > 0) {
      setStores(userStores, currentStoreId);
    }
  }, [ctxStores.length, userStores, currentStoreId, setStores]);
  const current = stores.find((s) => s.id === currentStoreId);

  if (!stores.length) return null;

  const switchTo = (storeId: number) => {
    if (storeId === currentStoreId) { setOpen(false); return; }
    selectStore.mutate({ data: { storeId } }, {
      onSuccess: (res) => {
        setToken(res.token);
        setCurrentStoreId(res.currentStoreId);
        setStores(stores, res.currentStoreId);
        qc.clear();
        setOpen(false);
      },
    });
  };

  if (stores.length === 1) {
    if (collapsed) return null;
    return (
      <div className="px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
          <StoreIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" title={current?.nameEn}>{current?.nameEn}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative border-b border-sidebar-border", collapsed ? "py-2 flex justify-center" : "p-2")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-md text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition flex items-center",
          collapsed ? "h-9 w-9 justify-center" : "w-full px-2 py-2 gap-2 text-left"
        )}
        title={collapsed ? current?.nameEn : undefined}
        data-testid="button-store-switcher"
      >
        <StoreIcon className="h-4 w-4 shrink-0 text-primary" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">Magasin</div>
            <div className="text-sm font-medium truncate">{current?.nameEn ?? "—"}</div>
          </div>
        )}
        {!collapsed && <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />}
      </button>
      {open && (
        <div className={cn(
          "absolute z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden",
          collapsed ? "left-full ml-2 top-0 w-56" : "left-2 right-2 top-full"
        )}>
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchTo(s.id)}
              className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent"
              data-testid={`switch-store-${s.id}`}
            >
              {s.id === currentStoreId ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
              <div className="flex-1 min-w-0 text-left">
                <div className="truncate">{s.nameEn}</div>
                <div className="text-xs text-muted-foreground truncate" dir="rtl">{s.nameAr}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Live count of pending online orders for the current store. Reuses the
 * same `useGetAdminOrders({ channel: "online" })` query as the inbox page
 * (distinct queryKey from the legacy Orders list) so the badge refreshes
 * automatically when the realtime WS invalidates `/api/erp/orders`.
 */
function useOnlineOrdersPendingCount(): number {
  const { currentStoreId } = useStoreContext();
  const params = { channel: GetAdminOrdersChannel.online };
  const { data } = useGetAdminOrders(
    params,
    { query: { enabled: !!currentStoreId, queryKey: getGetAdminOrdersQueryKey(params) } },
  );
  if (!data) return 0;
  return data.filter((o) => o.status === "pending").length;
}

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { isAdmin, user } = useMe();
  const userId = (user as { id?: number | string } | null)?.id ?? null;
  const visibleItems = navItems.filter((it) => !it.adminOnly || isAdmin);
  const onlineOrdersPending = useOnlineOrdersPendingCount();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [muted, setMuted] = useState<boolean>(() => isChimeMuted(userId));

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  // Re-read mute preference whenever the active user changes so a
  // different account on the same browser does not inherit the previous
  // user's mute state.
  useEffect(() => {
    setMuted(isChimeMuted(userId));
  }, [userId]);

  const toggleMuted = () => {
    setMuted((prev) => {
      const next = !prev;
      setChimeMuted(userId, next);
      // When unmuting, play a short chime so the user knows it works and
      // the browser's audio context gets unlocked by this user gesture.
      if (!next) playNewOrderChime(userId);
      return next;
    });
  };

  const renderContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border py-5",
          isCollapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
      >
        <img src={logoPath} alt="Midanic" className="h-8 w-auto rounded shrink-0" />
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="font-bold text-sidebar-foreground text-sm leading-tight truncate">Midanic ERP</div>
            <div className="text-xs text-sidebar-foreground/60 truncate" dir="rtl">ميدانيك</div>
          </div>
        )}
      </div>

      <StoreSwitcher collapsed={isCollapsed} />

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map(({ href, icon: Icon, labelEn, labelAr, badge }) => {
          const active = location === href || location.startsWith(href + "/");
          const badgeCount = badge === "online-orders-pending" ? onlineOrdersPending : 0;
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              <div
                data-testid={`nav-${href.replace("/", "")}`}
                title={isCollapsed ? `${labelEn} / ${labelAr}` : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors cursor-pointer relative",
                  isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {isCollapsed && badgeCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center"
                      data-testid={`nav-badge-${href.replace("/", "")}`}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{labelEn}</div>
                    <div className="truncate text-xs opacity-70" dir="rtl">{labelAr}</div>
                  </div>
                )}
                {!isCollapsed && badgeCount > 0 && (
                  <span
                    className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center"
                    data-testid={`nav-badge-${href.replace("/", "")}`}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border space-y-1", isCollapsed ? "p-2" : "p-3")}>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className={cn(
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            isCollapsed ? "w-full h-9" : "w-full justify-start"
          )}
          onClick={toggleMuted}
          data-testid="button-toggle-order-chime"
          aria-label={muted ? "Unmute new-order sound" : "Mute new-order sound"}
          aria-pressed={muted}
          title={
            isCollapsed
              ? (muted ? "Unmute new-order sound / تشغيل صوت الطلبات" : "Mute new-order sound / كتم صوت الطلبات")
              : undefined
          }
        >
          {muted
            ? <VolumeX className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            : <Volume2 className={cn("h-4 w-4", !isCollapsed && "mr-2")} />}
          {!isCollapsed && (
            <span>{muted ? "Sound off / صوت مغلق" : "Sound on / صوت مفعل"}</span>
          )}
        </Button>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className={cn(
            "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            isCollapsed ? "w-full h-9" : "w-full justify-start"
          )}
          onClick={logout}
          data-testid="button-logout"
          title={isCollapsed ? "Logout / خروج" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && <span>Logout / خروج</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar flex items-center px-4 border-b border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground mr-3"
          onClick={() => setOpen(!open)}
          data-testid="button-mobile-menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <img src={logoPath} alt="Midanic" className="h-7 w-auto" />
        <span className="ml-2 font-bold text-sidebar-foreground text-sm">Midanic ERP</span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar — always expanded for readability */}
      <div className={cn(
        "lg:hidden fixed top-14 left-0 bottom-0 z-50 w-64 bg-sidebar transition-transform",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {renderContent(false)}
      </div>

      {/* Desktop sidebar — collapsible */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col lg:shrink-0 bg-sidebar min-h-screen relative transition-[width] duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
      >
        {renderContent(collapsed)}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          data-testid="button-toggle-sidebar"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-6 -right-3 z-10 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent flex items-center justify-center shadow"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </>
  );
}
