"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@edutap.test",
      password: "EduTap@2026"
    }
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") ?? "/dashboard"
    });
    setIsSubmitting(false);

    if (result?.error) {
      toast.error("Login failed", {
        description: "Check the email and password, then try again."
      });
      return;
    }

    toast.success("Welcome back to EduTap");
    router.push(result?.url ?? "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-normal">Welcome back</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in to your teaching dashboard and continue managing today&apos;s classes.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email or mobile</Label>
          <Input id="email" type="text" autoComplete="username" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        EduTap user?{" "}
        <Link href="/student/register" className="font-semibold text-primary hover:underline">
          Create EduTap Account
        </Link>
      </p>
    </div>
  );
}
