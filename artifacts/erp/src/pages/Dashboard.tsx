import React from "react";
import { useGetAnalytics, useGetAccountingSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import { ShoppingCart, Package, Users, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: analytics, isLoading } = useGetAnalytics();
  const { data: summary } = useGetAccountingSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard / لوحة التحكم</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const stats = [
    {
      labelEn: "Total Revenue", labelAr: "إجمالي الإيرادات",
      value: `SAR ${(analytics?.totalRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp, color: "text-emerald-600"
    },
    {
      labelEn: "Total Orders", labelAr: "إجمالي الطلبات",
      value: analytics?.totalOrders ?? 0,
      icon: ShoppingCart, color: "text-blue-600"
    },
    {
      labelEn: "Products", labelAr: "المنتجات",
      value: analytics?.totalProducts ?? 0,
      icon: Package, color: "text-amber-600"
    },
    {
      labelEn: "Customers", labelAr: "العملاء",
      value: analytics?.totalCustomers ?? 0,
      icon: Users, color: "text-purple-600"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5" dir="rtl">لوحة التحكم</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ labelEn, labelAr, value, icon: Icon, color }) => (
          <Card key={labelEn} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{labelEn}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5" dir="rtl">{labelAr}</p>
                  <p className="text-2xl font-bold mt-2 text-foreground">{value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Sales / المبيعات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics?.dailySales ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`SAR ${v}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Products / أفضل المنتجات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analytics?.topProducts ?? []).slice(0, 5).map((p: any) => (
                <div key={p.productId} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nameEn}</p>
                    <p className="text-xs text-muted-foreground truncate" dir="rtl">{p.nameAr}</p>
                  </div>
                  <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {p.totalSold} sold
                  </span>
                </div>
              ))}
              {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounting Summary */}
      {summary && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Financial Overview / نظرة مالية عامة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Income / الدخل</p>
                <p className="text-xl font-bold text-emerald-600">SAR {summary.totalIncome?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Expenses / المصروفات</p>
                <p className="text-xl font-bold text-red-500">SAR {summary.totalExpense?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Balance / الرصيد الصافي</p>
                <p className={`text-xl font-bold ${(summary.netBalance ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                  SAR {summary.netBalance?.toLocaleString()}
                </p>
              </div>
            </div>
            {summary.monthly && summary.monthly.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={summary.monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="income" fill="hsl(var(--chart-3))" name="Income" radius={2} />
                  <Bar dataKey="expense" fill="hsl(var(--chart-5))" name="Expense" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
