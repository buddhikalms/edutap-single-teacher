"use client";

import type React from "react";
import { useActionState, useEffect } from "react";
import { Building2, Palette, ReceiptText, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateInstituteSettings } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SettingsFormProps = {
  institute: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    logoUrl: string | null;
  };
  settings: {
    receiptPrefix: string;
    receiptFooter: string | null;
    paymentDueDay: number;
    attendanceLateAfterMins: number;
    attendanceAutoAbsent: boolean;
    currency: string;
    themeColor: string;
    logoPlaceholder: string | null;
  };
  branches: Array<{
    id: string;
    name: string;
    code: string;
    phone: string | null;
    address: string | null;
  }>;
};

export function InstituteSettingsForm({ institute, settings, branches }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateInstituteSettings, { ok: false, message: "" });
  const primaryBranch = branches[0];

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.ok) {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Institute profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Institute name" htmlFor="instituteName">
              <Input id="instituteName" name="instituteName" defaultValue={institute.name} required />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={institute.email} required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={institute.phone ?? ""} />
            </Field>
            <Field label="Logo upload placeholder" htmlFor="logoPlaceholder">
              <div className="flex gap-2">
                <Input id="logoPlaceholder" name="logoPlaceholder" defaultValue={settings.logoPlaceholder ?? institute.logoUrl ?? ""} placeholder="Logo URL or upload note" />
                <Button type="button" variant="outline" size="icon" aria-label="Logo upload placeholder">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="Address" htmlFor="address">
                <Textarea id="address" name="address" defaultValue={institute.address ?? ""} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Receipt and payment rules
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Receipt prefix" htmlFor="receiptPrefix">
              <Input id="receiptPrefix" name="receiptPrefix" defaultValue={settings.receiptPrefix} required />
            </Field>
            <Field label="Payment due day" htmlFor="paymentDueDay">
              <Input id="paymentDueDay" name="paymentDueDay" type="number" min={1} max={28} defaultValue={settings.paymentDueDay} required />
            </Field>
            <Field label="Currency" htmlFor="currency">
              <Select id="currency" name="currency" defaultValue={settings.currency}>
                <option value="USD">USD</option>
                <option value="LKR">LKR</option>
                <option value="INR">INR</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
              </Select>
            </Field>
            <Field label="Theme color" htmlFor="themeColor">
              <div className="flex gap-2">
                <Input id="themeColor" name="themeColor" type="color" className="w-16 px-2" defaultValue={settings.themeColor} required />
                <Input name="themeColorText" value={settings.themeColor} readOnly className="hidden" />
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="Receipt footer" htmlFor="receiptFooter">
                <Textarea id="receiptFooter" name="receiptFooter" defaultValue={settings.receiptFooter ?? ""} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Attendance rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Late after minutes" htmlFor="attendanceLateAfterMins">
              <Input
                id="attendanceLateAfterMins"
                name="attendanceLateAfterMins"
                type="number"
                min={0}
                max={180}
                defaultValue={settings.attendanceLateAfterMins}
                required
              />
            </Field>
            <label className="flex items-start gap-3 rounded-xl border bg-white/70 p-4 text-sm">
              <Checkbox name="attendanceAutoAbsent" defaultChecked={settings.attendanceAutoAbsent} />
              <span>
                <span className="block font-semibold">Auto-absent unmarked students</span>
                <span className="mt-1 block text-muted-foreground">Use this rule when closing attendance sessions.</span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branch settings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {primaryBranch ? (
              <>
                <input type="hidden" name="branchId" value={primaryBranch.id} />
                <Field label="Primary branch" htmlFor="branchName">
                  <Input id="branchName" name="branchName" defaultValue={primaryBranch.name} required />
                </Field>
                <Field label="Branch code" htmlFor="branchCode">
                  <Input id="branchCode" name="branchCode" defaultValue={primaryBranch.code} required />
                </Field>
                <Field label="Branch phone" htmlFor="branchPhone">
                  <Input id="branchPhone" name="branchPhone" defaultValue={primaryBranch.phone ?? ""} />
                </Field>
                <Field label="Branch address" htmlFor="branchAddress">
                  <Input id="branchAddress" name="branchAddress" defaultValue={primaryBranch.address ?? ""} />
                </Field>
              </>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-dashed bg-white/60 p-6 text-sm text-muted-foreground">Create a branch to manage branch-level settings.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
