"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  publicInstituteRegistrationSchema,
  publicTeacherRegistrationSchema,
  type PublicInstituteRegistrationInput,
  type PublicTeacherRegistrationInput
} from "@/lib/validations";

const packageOptions = [
  { value: "SINGLE_TEACHER", label: "Single Teacher EduTap" },
  { value: "INSTITUTE_STARTER", label: "Institute Starter EduTap" },
  { value: "INSTITUTE_PRO", label: "Institute Pro EduTap" },
  { value: "ENTERPRISE", label: "EduTap Enterprise" }
];

export function TeacherRegistrationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<PublicTeacherRegistrationInput>({
    resolver: zodResolver(publicTeacherRegistrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      profilePhotoUrl: "",
      subject: "",
      gradesTaught: "",
      teachingMode: "ONLINE",
      experience: "",
      qualifications: "",
      bio: "",
      preferredPackage: "SINGLE_TEACHER",
      agreement: false as unknown as true
    }
  });

  async function onSubmit(values: PublicTeacherRegistrationInput) {
    setIsSubmitting(true);
    const response = await fetch("/api/public/teacher-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Registration failed", { description: payload?.message ?? "Please review the teacher details." });
      return;
    }

    router.push("/register/success?type=teacher");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" error={form.formState.errors.fullName?.message}>
          <Input {...form.register("fullName")} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" {...form.register("email")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
      </div>
      <Field label="Profile photo URL" error={form.formState.errors.profilePhotoUrl?.message}>
        <Input placeholder="Optional placeholder URL" {...form.register("profilePhotoUrl")} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Subject" error={form.formState.errors.subject?.message}>
          <Input {...form.register("subject")} />
        </Field>
        <Field label="Grades taught" error={form.formState.errors.gradesTaught?.message}>
          <Input placeholder="Grade 10, Grade 11, Adults" {...form.register("gradesTaught")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Teaching mode" error={form.formState.errors.teachingMode?.message}>
          <Select {...form.register("teachingMode")}>
            <option value="ONLINE">Online</option>
            <option value="PHYSICAL">Physical</option>
            <option value="BOTH">Both</option>
          </Select>
        </Field>
        <Field label="Preferred package" error={form.formState.errors.preferredPackage?.message}>
          <Select {...form.register("preferredPackage")}>
            {packageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Experience" error={form.formState.errors.experience?.message}>
          <Input placeholder="5 years" {...form.register("experience")} />
        </Field>
        <Field label="Qualifications" error={form.formState.errors.qualifications?.message}>
          <Input {...form.register("qualifications")} />
        </Field>
      </div>
      <Field label="Bio" error={form.formState.errors.bio?.message}>
        <Textarea rows={5} {...form.register("bio")} />
      </Field>
      <div className="flex items-start gap-3 rounded-lg border bg-muted/45 p-4">
        <Checkbox
          checked={form.watch("agreement")}
          onChange={(event) => form.setValue("agreement", event.target.checked, { shouldValidate: true })}
        />
        <div>
          <Label>I agree to EduTap verification and teacher approval terms.</Label>
          {form.formState.errors.agreement ? <p className="mt-1 text-sm text-destructive">{form.formState.errors.agreement.message}</p> : null}
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Submit teacher request
      </Button>
    </form>
  );
}

export function InstituteRegistrationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<PublicInstituteRegistrationInput>({
    resolver: zodResolver(publicInstituteRegistrationSchema),
    defaultValues: {
      instituteName: "",
      ownerName: "",
      email: "",
      phone: "",
      branchCount: 1,
      studentCount: 0,
      preferredPackage: "INSTITUTE_STARTER",
      password: "",
      address: "",
      logoUrl: ""
    }
  });

  async function onSubmit(values: PublicInstituteRegistrationInput) {
    setIsSubmitting(true);
    const response = await fetch("/api/public/institute-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Registration failed", { description: payload?.message ?? "Please review the institute details." });
      return;
    }

    router.push("/register/success?type=institute");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Institute name" error={form.formState.errors.instituteName?.message}>
          <Input {...form.register("instituteName")} />
        </Field>
        <Field label="Owner name" error={form.formState.errors.ownerName?.message}>
          <Input {...form.register("ownerName")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" {...form.register("email")} />
        </Field>
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input {...form.register("phone")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch count" error={form.formState.errors.branchCount?.message}>
          <Input type="number" min={1} {...form.register("branchCount")} />
        </Field>
        <Field label="Student count" error={form.formState.errors.studentCount?.message}>
          <Input type="number" min={0} {...form.register("studentCount")} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Preferred package" error={form.formState.errors.preferredPackage?.message}>
          <Select {...form.register("preferredPackage")}>
            {packageOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
      </div>
      <Field label="Address" error={form.formState.errors.address?.message}>
        <Input {...form.register("address")} />
      </Field>
      <Field label="Logo URL" error={form.formState.errors.logoUrl?.message}>
        <Input placeholder="Optional placeholder URL" {...form.register("logoUrl")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        Create institute workspace
      </Button>
    </form>
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
