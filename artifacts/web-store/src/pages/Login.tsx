import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import logoPath from "@assets/logo_des_13_midanic_1777739613232.jpeg";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({ title: "Welcome back! / مرحباً بعودتك!" });
          setLocation("/");
        },
        onError: (error: any) => {
          toast({
            title: "Login failed / فشل تسجيل الدخول",
            description: error.message || "Please check your credentials",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/10">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logoPath} alt="Midanic Logo" className="h-16 w-auto mb-6" />
          <h1 className="text-3xl font-serif font-bold text-primary mb-2 text-center">Welcome Back</h1>
          <h1 className="text-3xl font-serif font-bold text-primary text-center" dir="rtl">مرحباً بعودتك</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email / البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password / كلمة المرور</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-medium" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login / تسجيل الدخول"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          Don't have an account? / ليس لديك حساب؟{" "}
          <Link href="/auth/register" className="text-primary hover:text-primary/80 hover:underline font-semibold ml-1">
            Register / تسجيل جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
