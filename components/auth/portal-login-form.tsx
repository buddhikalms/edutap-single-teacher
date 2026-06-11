"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "avery.parent@classcard.test",
      password: "ClassCard@2026"
    }
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") ?? "/portal"
    });
    setIsSubmitting(false);

    if (result?.error) {
      toast.error("Portal login failed", {
        description: "Use the guardian/student email or linked mobile number."
      });
      return;
    }

    toast.success("Welcome to your ClassCard portal");
    router.push(result?.url ?? "/portal");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md border-white/70 bg-white/95 shadow-2xl">
      <CardContent className="p-7">
        <div className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">Family portal</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in with your parent or student email, or a linked mobile number.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="portal-email">Email or mobile</Label>
            <Input id="portal-email" type="text" autoComplete="username" {...form.register("email")} />
            {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal-password">Password</Label>
            <Input id="portal-password" type="password" autoComplete="current-password" {...form.register("password")} />
            {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Enter family portal
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Staff member?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Open dashboard login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
