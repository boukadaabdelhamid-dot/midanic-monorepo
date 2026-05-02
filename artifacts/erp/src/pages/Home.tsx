import React from "react";
import { useLocation } from "wouter";
import {
  Package, ShoppingCart, FileText, Wallet,
  UserCheck, Truck, Users, LayoutDashboard,
  Activity, BarChart2, Clock, Calendar, CreditCard
} from "lucide-react";

const modules = [
  {
    labelFr: "Articles", labelAr: "المنتجات",
    href: "/products", icon: Package,
    gradient: "from-cyan-400 to-cyan-500",
    shadow: "shadow-cyan-200",
  },
  {
    labelFr: "Ventes", labelAr: "المبيعات",
    href: "/orders", icon: ShoppingCart,
    gradient: "from-green-400 to-emerald-500",
    shadow: "shadow-green-200",
  },
  {
    labelFr: "Achats", labelAr: "المشتريات",
    href: "/purchase-orders", icon: FileText,
    gradient: "from-rose-400 to-pink-500",
    shadow: "shadow-rose-200",
  },
  {
    labelFr: "Caisse", labelAr: "الصندوق",
    href: "/caisse", icon: Wallet,
    gradient: "from-yellow-400 to-amber-500",
    shadow: "shadow-yellow-200",
  },
  {
    labelFr: "Clients", labelAr: "العملاء",
    href: "/customers", icon: UserCheck,
    gradient: "from-sky-400 to-blue-500",
    shadow: "shadow-sky-200",
  },
  {
    labelFr: "Fournisseurs", labelAr: "الموردون",
    href: "/suppliers", icon: Truck,
    gradient: "from-violet-400 to-purple-500",
    shadow: "shadow-violet-200",
  },
  {
    labelFr: "Employés", labelAr: "الموظفون",
    href: "/employees", icon: Users,
    gradient: "from-blue-400 to-indigo-500",
    shadow: "shadow-blue-200",
  },
  {
    labelFr: "Tableau de bord", labelAr: "لوحة التحكم",
    href: "/dashboard", icon: LayoutDashboard,
    gradient: "from-slate-500 to-slate-700",
    shadow: "shadow-slate-300",
  },
  {
    labelFr: "Temps Réel", labelAr: "الوقت الفعلي",
    href: "/realtime", icon: Activity,
    gradient: "from-pink-400 to-rose-500",
    shadow: "shadow-pink-200",
  },
  {
    labelFr: "Stock", labelAr: "المخزون",
    href: "/inventory", icon: BarChart2,
    gradient: "from-indigo-500 to-blue-700",
    shadow: "shadow-indigo-200",
  },
  {
    labelFr: "Présences", labelAr: "الحضور",
    href: "/attendance", icon: Clock,
    gradient: "from-teal-400 to-teal-600",
    shadow: "shadow-teal-200",
  },
  {
    labelFr: "Congés", labelAr: "الإجازات",
    href: "/leaves", icon: Calendar,
    gradient: "from-orange-400 to-orange-500",
    shadow: "shadow-orange-200",
  },
  {
    labelFr: "Comptabilité", labelAr: "المحاسبة",
    href: "/accounting", icon: CreditCard,
    gradient: "from-fuchsia-400 to-fuchsia-600",
    shadow: "shadow-fuchsia-200",
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3057] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-lg font-bold tracking-wide">Midanic ERP</h1>
          <p className="text-xs text-white/70" dir="rtl">نظام إدارة ميدانيك</p>
        </div>
        <div className="text-xs text-white/60 text-right" dir="rtl">
          <p>{new Date().toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {modules.map(({ labelFr, labelAr, href, icon: Icon, gradient, shadow }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} group-hover:shadow-xl transition-shadow`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm leading-tight">{labelFr}</p>
                <p className="text-xs text-gray-500 mt-0.5" dir="rtl">{labelAr}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
