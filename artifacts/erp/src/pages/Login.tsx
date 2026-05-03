import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useSelectStore } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useStoreContext } from "@/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoPath from "@assets/logo_des_13_midanic_1777739613232.jpeg";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { setStores, setCurrentStoreId, clear } = useStoreContext();
  const loginMutation = useLogin();
  const selectStore = useSelectStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          clear();
          const stores = res.stores ?? [];
          if (stores.length === 0) {
            // customer or no store assigned
            setLocation("/home");
          } else if (stores.length === 1) {
            // auto-select the only store
            selectStore.mutate(
              { data: { storeId: stores[0].id } },
              {
                onSuccess: (sres) => {
                  setToken(sres.token);
                  setStores(stores, sres.currentStoreId);
                  setLocation("/home");
                },
              }
            );
          } else {
            setStores(stores, null);
            setLocation("/select-store");
          }
        },
        onError: () => {
          setError("email", { message: "Invalid credentials / بيانات غير صحيحة" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="text-center pb-4">
          <img src={logoPath} alt="Midanic" className="h-16 mx-auto mb-3 rounded" />
          <CardTitle className="text-2xl font-bold text-primary">Midanic ERP</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Admin Access / وصول المسؤول</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email / البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@midanic.com"
                data-testid="input-email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password / كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-testid="input-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In / تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
