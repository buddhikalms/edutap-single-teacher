"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { studentSelfRegistrationSchema, type StudentSelfRegistrationInput } from "@/lib/validations";

type InstituteOption = {
  id: string;
  name: string;
  slug: string;
  branches: Array<{ id: string; name: string; code: string }>;
};

type RegisterResponse = {
  ok: true;
  message: string;
  student: { admissionNo: string; name: string };
};

export function StudentRegistrationForm({ institutes }: { institutes: InstituteOption[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState<RegisterResponse["student"] | null>(null);
  const defaultInstitute = institutes[0];
  const form = useForm<StudentSelfRegistrationInput>({
    resolver: zodResolver(studentSelfRegistrationSchema),
    defaultValues: {
      instituteSlug: defaultInstitute?.slug ?? "",
      branchId: defaultInstitute?.branches[0]?.id ?? "",
      branchCode: undefined,
      admissionNo: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: undefined,
      dateOfBirth: undefined,
      password: "",
      parentName: "",
      parentRelationship: "Guardian",
      parentEmail: undefined,
      parentPhone: "",
      parentNic: undefined,
      parentAddress: undefined,
      parentAppLogin: "",
      emergencyContactNumber: "",
      parentOccupation: undefined
    }
  });

  const instituteSlug = useWatch({ control: form.control, name: "instituteSlug" });
  const selectedInstitute = useMemo(
    () => institutes.find((institute) => institute.slug === instituteSlug) ?? defaultInstitute,
    [defaultInstitute, instituteSlug, institutes]
  );

  async function submit(values: StudentSelfRegistrationInput) {
    setIsSubmitting(true);
    setRegistered(null);

    const response = await fetch("/api/student-mobile/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    toast.success("Student registered", {
      description: "You can now sign in to the student mobile app."
    });
    setRegistered(payload.student);
    form.reset({
      ...values,
      admissionNo: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: undefined,
      dateOfBirth: undefined,
      password: "",
      parentName: "",
      parentRelationship: "Guardian",
      parentEmail: undefined,
      parentPhone: "",
      parentNic: undefined,
      parentAddress: undefined,
      parentAppLogin: "",
      emergencyContactNumber: "",
      parentOccupation: undefined
    });
  }

  if (!institutes.length) {
    return (
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Student registration</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">No active institutes are available for student registration yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-semibold tracking-normal">Student registration</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create your student account and submit parent or guardian details for institute review.
        </p>
        <div className="mt-4">
          <InstallAppButton />
        </div>
      </div>

      {registered ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-semibold">{registered.name} registered successfully.</p>
          <p className="mt-1">Admission number: {registered.admissionNo}</p>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institute" error={form.formState.errors.instituteSlug?.message}>
            <Select
              {...form.register("instituteSlug")}
              onChange={(event) => {
                const institute = institutes.find((item) => item.slug === event.target.value);
                form.setValue("instituteSlug", event.target.value, { shouldValidate: true });
                form.setValue("branchId", institute?.branches[0]?.id ?? "", { shouldValidate: true });
              }}
            >
              {institutes.map((institute) => (
                <option key={institute.id} value={institute.slug}>
                  {institute.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch" error={form.formState.errors.branchId?.message}>
            <Select {...form.register("branchId")}>
              {selectedInstitute?.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Admission number (optional)" error={form.formState.errors.admissionNo?.message}>
          <Input placeholder="Leave blank to auto-generate" {...form.register("admissionNo")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={form.formState.errors.firstName?.message}>
            <Input {...form.register("firstName")} />
          </Field>
          <Field label="Last name" error={form.formState.errors.lastName?.message}>
            <Input {...form.register("lastName")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student email" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="Student phone" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}>
            <Input type="date" {...form.register("dateOfBirth")} />
          </Field>
          <Field label="Password" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
        </div>

        <div className="border-t pt-5">
          <p className="mb-4 font-semibold">Parent / guardian details</p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian name" error={form.formState.errors.parentName?.message}>
                <Input {...form.register("parentName")} />
              </Field>
              <Field label="Relationship" error={form.formState.errors.parentRelationship?.message}>
                <Select {...form.register("parentRelationship")}>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian phone" error={form.formState.errors.parentPhone?.message}>
                <Input {...form.register("parentPhone")} />
              </Field>
              <Field label="Emergency contact number" error={form.formState.errors.emergencyContactNumber?.message}>
                <Input {...form.register("emergencyContactNumber")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian email" error={form.formState.errors.parentEmail?.message}>
                <Input type="email" {...form.register("parentEmail")} />
              </Field>
              <Field label="Parent app login mobile/email" error={form.formState.errors.parentAppLogin?.message}>
                <Input {...form.register("parentAppLogin")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Parent NIC" error={form.formState.errors.parentNic?.message}>
                <Input {...form.register("parentNic")} />
              </Field>
              <Field label="Occupation" error={form.formState.errors.parentOccupation?.message}>
                <Input {...form.register("parentOccupation")} />
              </Field>
            </div>
            <Field label="Parent address" error={form.formState.errors.parentAddress?.message}>
              <Input {...form.register("parentAddress")} />
            </Field>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create student account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Institute admin?{" "}
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
