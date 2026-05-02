import React from "react";
import { useGetAnalytics, useGetAccountingSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import { ShoppingCart, TrendingUp, Clock, DollarSign } from "lucide-react";

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
      labelEn: "Pending Orders", labelAr: "الطلبات المعلقة",
      value: analytics?.pendingOrders ?? 0,
      icon: Clock, color: "text-amber-600"
    },
    {
      labelEn: "Net Profit", labelAr: "صافي الربح",
      value: `SAR ${(analytics?.netProfit ?? 0).toLocaleString()}`,
      icon: DollarSign, color: "text-purple-600"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5" dir="rtl">لوحة التحكم</p>
      </div>

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
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Sales / المبيعات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={(analytics?.dailySales ?? []) as Record<string, unknown>[]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`SAR ${v}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Products / أفضل المنتجات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {((analytics?.topProducts ?? []) as Record<string, unknown>[]).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{String(p["name_en"] ?? p["nameEn"] ?? "")}</p>
                    <p className="text-xs text-muted-foreground truncate" dir="rtl">{String(p["name_ar"] ?? p["nameAr"] ?? "")}</p>
                  </div>
                  <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {String(p["sold"] ?? p["totalSold"] ?? 0)} sold
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
                <p className="text-xl font-bold text-red-500">SAR {summary.totalExpenses?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Profit / صافي الربح</p>
                <p className={`text-xl font-bold ${(summary.netProfit ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                  SAR {summary.netProfit?.toLocaleString()}
                </p>
              </div>
            </div>
            {summary.monthly && summary.monthly.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={summary.monthly as Record<string, unknown>[]}>
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
