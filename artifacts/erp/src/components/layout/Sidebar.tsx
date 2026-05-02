import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Clock,
  Calendar, Truck, FileText, BarChart2, CreditCard,
  UserCheck, LogOut, Menu, X, Wallet, Activity, Home
} from "lucide-react";
import logoPath from "@assets/logo_des_13_midanic_1777739613232.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, labelEn: "Home", labelAr: "الرئيسية" },
  { href: "/dashboard", icon: LayoutDashboard, labelEn: "Dashboard", labelAr: "لوحة التحكم" },
  { href: "/realtime", icon: Activity, labelEn: "Temps Réel", labelAr: "الوقت الفعلي" },
  { href: "/caisse", icon: Wallet, labelEn: "Caisse", labelAr: "الصندوق" },
  { href: "/orders", icon: ShoppingCart, labelEn: "Ventes", labelAr: "المبيعات" },
  { href: "/products", icon: Package, labelEn: "Articles", labelAr: "المنتجات" },
  { href: "/purchase-orders", icon: FileText, labelEn: "Achats", labelAr: "المشتريات" },
  { href: "/inventory", icon: BarChart2, labelEn: "Stock", labelAr: "المخزون" },
  { href: "/customers", icon: UserCheck, labelEn: "Clients", labelAr: "العملاء" },
  { href: "/suppliers", icon: Truck, labelEn: "Fournisseurs", labelAr: "الموردون" },
  { href: "/employees", icon: Users, labelEn: "Employés", labelAr: "الموظفون" },
  { href: "/attendance", icon: Clock, labelEn: "Présences", labelAr: "الحضور" },
  { href: "/leaves", icon: Calendar, labelEn: "Congés", labelAr: "الإجازات" },
  { href: "/accounting", icon: CreditCard, labelEn: "Comptabilité", labelAr: "المحاسبة" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={logoPath} alt="Midanic" className="h-8 w-auto rounded" />
        <div>
          <div className="font-bold text-sidebar-foreground text-sm leading-tight">Midanic ERP</div>
          <div className="text-xs text-sidebar-foreground/60" dir="rtl">ميدانيك</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ href, icon: Icon, labelEn, labelAr }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              <div
                data-testid={`nav-${href.replace("/", "")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{labelEn}</div>
                  <div className="truncate text-xs opacity-70" dir="rtl">{labelAr}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout / خروج
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

      {/* Mobile sidebar */}
      <div className={cn(
        "lg:hidden fixed top-14 left-0 bottom-0 z-50 w-64 bg-sidebar transition-transform",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-sidebar min-h-screen">
        {sidebarContent}
      </div>
    </>
  );
}
