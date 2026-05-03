import React from "react";
import { useLocation } from "wouter";
import {
  Package, ShoppingCart, FileText, Wallet,
  UserCheck, Truck, Users, LayoutDashboard,
  Activity, BarChart2, Clock, Calendar, CreditCard,
} from "lucide-react";

const modules = [
  { labelFr: "Articles",        labelAr: "المنتجات",     href: "/products",        icon: Package,         color: "bg-cyan-500" },
  { labelFr: "Ventes",          labelAr: "المبيعات",     href: "/orders",          icon: ShoppingCart,    color: "bg-emerald-500" },
  { labelFr: "Achats",          labelAr: "المشتريات",   href: "/purchase-orders", icon: FileText,        color: "bg-rose-500" },
  { labelFr: "Caisse",          labelAr: "الصندوق",     href: "/caisse",          icon: Wallet,          color: "bg-amber-500" },
  { labelFr: "Clients",         labelAr: "العملاء",     href: "/customers",       icon: UserCheck,       color: "bg-sky-500" },
  { labelFr: "Fournisseurs",    labelAr: "الموردون",    href: "/suppliers",       icon: Truck,           color: "bg-violet-500" },
  { labelFr: "Employés",        labelAr: "الموظفون",    href: "/employees",       icon: Users,           color: "bg-indigo-500" },
  { labelFr: "Tableau de bord", labelAr: "لوحة التحكم", href: "/dashboard",       icon: LayoutDashboard, color: "bg-slate-600" },
  { labelFr: "Temps Réel",      labelAr: "الوقت الفعلي", href: "/realtime",        icon: Activity,        color: "bg-pink-500" },
  { labelFr: "Stock",           labelAr: "المخزون",     href: "/inventory",       icon: BarChart2,       color: "bg-blue-600" },
  { labelFr: "Présences",       labelAr: "الحضور",      href: "/attendance",      icon: Clock,           color: "bg-teal-500" },
  { labelFr: "Congés",          labelAr: "الإجازات",    href: "/leaves",          icon: Calendar,        color: "bg-orange-500" },
  { labelFr: "Comptabilité",    labelAr: "المحاسبة",   href: "/accounting",      icon: CreditCard,      color: "bg-fuchsia-500" },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3057] text-white px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-wide text-base">SIRAJ</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            MASCARA COIFFURE
          </span>
        </div>
        <div className="text-xs text-white/70 text-right" dir="rtl">
          {new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 max-w-5xl mx-auto">
          {modules.map(({ labelFr, labelAr, href, icon: Icon, color }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="group flex flex-col items-center gap-3 focus:outline-none"
              data-testid={`home-tile-${href.replace("/", "")}`}
            >
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${color} flex items-center justify-center shadow-md group-hover:shadow-xl group-hover:-translate-y-0.5 transition-all duration-150`}
              >
                <Icon className="h-9 w-9 sm:h-10 sm:w-10 text-white" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-800 text-sm">{labelFr}</p>
                <p className="text-[11px] text-gray-500 mt-0.5" dir="rtl">{labelAr}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
