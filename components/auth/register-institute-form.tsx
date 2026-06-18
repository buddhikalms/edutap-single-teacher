"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerInstituteSchema, type RegisterInstituteInput } from "@/lib/validations";

export function RegisterInstituteForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterInstituteInput>({
    resolver: zodResolver(registerInstituteSchema),
    defaultValues: {
      instituteName: "",
      slug: "",
      email: "",
      phone: "",
      address: "",
      adminName: "",
      adminEmail: "",
      password: ""
    }
  });

  async function onSubmit(values: RegisterInstituteInput) {
    setIsSubmitting(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Registration failed", {
        description: payload?.message ?? "Please review the details and try again."
      });
      return;
    }

    toast.success("Institute created", {
      description: "You can now sign in with the admin account."
    });
    router.push("/login");
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-normal">Register institute</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create the first branch and admin account for a new EduTap workspace.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institute name" error={form.formState.errors.instituteName?.message}>
            <Input {...form.register("instituteName")} />
          </Field>
          <Field label="Workspace slug" error={form.formState.errors.slug?.message}>
            <Input placeholder="meridian-academy" {...form.register("slug")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institute email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} />
          </Field>
        </div>

        <Field label="Address" error={form.formState.errors.address?.message}>
          <Input {...form.register("address")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Admin name" error={form.formState.errors.adminName?.message}>
            <Input {...form.register("adminName")} />
          </Field>
          <Field label="Admin email" error={form.formState.errors.adminEmail?.message}>
            <Input type="email" {...form.register("adminEmail")} />
          </Field>
        </div>

        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
          Create workspace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
