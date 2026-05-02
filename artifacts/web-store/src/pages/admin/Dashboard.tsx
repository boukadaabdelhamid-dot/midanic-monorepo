import React from "react";
import { Link } from "wouter";
import { useGetAnalytics, type Product } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, TrendingUp, ShoppingCart, DollarSign, AlertCircle, CalendarCheck } from "lucide-react";
import { useLang } from "@/hooks/use-lang";

interface DailySalesRow {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProductRow {
  id: number;
  name_ar: string;
  name_en: string;
  sold: number;
  revenue: number;
}

export default function AdminDashboard() {
  const { lang } = useLang();
  const { data: analytics, isLoading } = useGetAnalytics();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntry = (analytics.dailySales || []).find(
    (row) => String(row["date"]).slice(0, 10) === todayStr,
  );
  const ordersToday = todayEntry ? Number(todayEntry["orders"] ?? 0) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          <h2 className="text-xl font-serif text-muted-foreground mt-1" dir="rtl">لوحة تحكم الإدارة</h2>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/products" className="text-sm font-medium hover:text-primary underline">Products</Link>
          <Link href="/admin/categories" className="text-sm font-medium hover:text-primary underline">Categories</Link>
          <Link href="/admin/orders" className="text-sm font-medium hover:text-primary underline">Orders</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SAR {Number(analytics.totalRevenue || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">SAR {Number(analytics.netProfit || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{ordersToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{analytics.pendingOrders || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Sales Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Daily Sales (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(analytics.dailySales as unknown as DailySalesRow[]) || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `SAR ${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.topProducts as unknown as TopProductRow[] || []).map((product, i) => (
                <div key={product.id ?? i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{lang === 'ar' ? product.name_ar : product.name_en}</p>
                      <p className="text-sm text-muted-foreground">{product.sold} units sold</p>
                    </div>
                  </div>
                  <div className="font-semibold text-primary">
                    SAR {Number(product.revenue || 0).toLocaleString()}
                  </div>
                </div>
              ))}
              {(!analytics.topProducts || analytics.topProducts.length === 0) && (
                <div className="text-center text-muted-foreground py-8">No sales data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning */}
      {analytics.lowStock && analytics.lowStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {analytics.lowStock.map((item: Product) => (
                <div key={item.id} className="flex justify-between items-center bg-card p-3 rounded-md border border-destructive/20 shadow-sm">
                  <span className="font-medium text-sm truncate pr-2">{lang === 'ar' ? item.nameAr : item.nameEn}</span>
                  <span className="text-destructive font-bold text-sm bg-destructive/10 px-2 py-1 rounded">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
