"use client";

import type React from "react";
import { useActionState, useEffect } from "react";
import { BellRing, Building2, CreditCard, Palette, ReceiptText, Upload } from "lucide-react";
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
    attendanceParentArrivalNotificationEnabled: boolean;
    attendanceParentIncludePaymentSummary: boolean;
    attendanceParentIncludeOverdueAmount: boolean;
    attendanceParentSendOncePerSession: boolean;
    attendanceParentSendOnPresent: boolean;
    attendanceParentSendOnLate: boolean;
    attendanceParentMessageTemplate: string | null;
    classEndedNotificationEnabled: boolean;
    classEndedIncludePaymentSummary: boolean;
    classEndedSendToPresent: boolean;
    classEndedSendToLate: boolean;
    classEndedSendToAbsent: boolean;
    classEndedMessageTemplate: string | null;
    notificationMobilePushEnabled: boolean;
    notificationWebPushEnabled: boolean;
    notificationInAppEnabled: boolean;
    notificationIncludeDueDates: boolean;
    cardRequireDuringRegistration: boolean;
    cardRequireBothNfcAndQr: boolean;
    cardAllowQrOnly: boolean;
    cardAllowNfcOnly: boolean;
    cardAutoGenerateQrToken: boolean;
    cardReplacementFee: unknown;
    cardNotifyParentOnReplacement: boolean;
    cardNotifyAdminOnLostOrStolenScan: boolean;
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

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Notification channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle name="notificationMobilePushEnabled" title="Enable mobile push" description="Send Expo push alerts to parent mobile apps." checked={settings.notificationMobilePushEnabled} />
            <Toggle name="notificationWebPushEnabled" title="Enable web push" description="Send browser push alerts to installed EduTap web apps." checked={settings.notificationWebPushEnabled} />
            <Toggle name="notificationInAppEnabled" title="Enable in-app alerts" description="Keep notifications in the parent portal inbox." checked={settings.notificationInAppEnabled} />
            <Toggle name="notificationIncludeDueDates" title="Include due dates" description="Add nearest due dates to payment-aware alerts." checked={settings.notificationIncludeDueDates} />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Student card rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle name="cardRequireDuringRegistration" title="Require card at registration" description="Block new student creation until a physical card is assigned." checked={settings.cardRequireDuringRegistration} />
            <Toggle name="cardRequireBothNfcAndQr" title="Require both NFC and QR" description="Force every active card to include both identifiers." checked={settings.cardRequireBothNfcAndQr} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Toggle name="cardAllowQrOnly" title="Allow QR-only cards" description="Permit assignment when NFC is not available." checked={settings.cardAllowQrOnly} />
              <Toggle name="cardAllowNfcOnly" title="Allow NFC-only cards" description="Permit assignment when QR is not available." checked={settings.cardAllowNfcOnly} />
              <Toggle name="cardAutoGenerateQrToken" title="Auto-generate QR token" description="Create a secure QR token if none is provided." checked={settings.cardAutoGenerateQrToken} />
              <Toggle name="cardNotifyParentOnReplacement" title="Notify parent on replacement" description="Reserved for parent notification workflows." checked={settings.cardNotifyParentOnReplacement} />
              <Toggle name="cardNotifyAdminOnLostOrStolenScan" title="Alert on lost/stolen scans" description="Flag suspicious lost or stolen card scans in the admin logs." checked={settings.cardNotifyAdminOnLostOrStolenScan} />
            </div>
            <Field label="Replacement fee" htmlFor="cardReplacementFee">
              <Input id="cardReplacementFee" name="cardReplacementFee" type="number" min={0} step="0.01" defaultValue={settings.cardReplacementFee ? String(settings.cardReplacementFee) : ""} />
            </Field>
          </CardContent>
        </Card>

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
              <BellRing className="h-5 w-5" />
              Class over notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              name="classEndedNotificationEnabled"
              title="Enable class over notification"
              description="Allow teachers and admins to notify parents after a class ends."
              checked={settings.classEndedNotificationEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Toggle
                name="classEndedIncludePaymentSummary"
                title="Include payment summary"
                description="Attach pending totals, due items, and nearest due date."
                checked={settings.classEndedIncludePaymentSummary}
              />
              <Toggle
                name="classEndedSendToPresent"
                title="Send to present students"
                description="Notify parents of students marked present."
                checked={settings.classEndedSendToPresent}
              />
              <Toggle
                name="classEndedSendToLate"
                title="Send to late students"
                description="Notify parents of students marked late."
                checked={settings.classEndedSendToLate}
              />
              <Toggle
                name="classEndedSendToAbsent"
                title="Send to absent students"
                description="Optional: include students marked absent."
                checked={settings.classEndedSendToAbsent}
              />
            </div>
            <Field label="Class over message template" htmlFor="classEndedMessageTemplate">
              <Textarea
                id="classEndedMessageTemplate"
                name="classEndedMessageTemplate"
                defaultValue={settings.classEndedMessageTemplate ?? ""}
                placeholder="{{className}} at {{branchName}} has ended at {{endTime}}. {{studentName}} attended the class today. {{paymentSummary}}"
              />
            </Field>
            <p className="text-xs leading-5 text-muted-foreground">
              Variables: {"{{studentName}}"}, {"{{className}}"}, {"{{branchName}}"}, {"{{teacherName}}"}, {"{{endTime}}"}, {"{{attendanceStatus}}"}, {"{{pendingTotal}}"}, {"{{nearestDueDate}}"}.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Parent arrival notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              name="attendanceParentArrivalNotificationEnabled"
              title="Send arrival notification"
              description="Notify linked parent app accounts when attendance is marked."
              checked={settings.attendanceParentArrivalNotificationEnabled}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Toggle
                name="attendanceParentIncludePaymentSummary"
                title="Include pending payments"
                description="Add pending totals, due items, and nearest due date."
                checked={settings.attendanceParentIncludePaymentSummary}
              />
              <Toggle
                name="attendanceParentIncludeOverdueAmount"
                title="Include overdue amount"
                description="Show overdue totals in the notification payload."
                checked={settings.attendanceParentIncludeOverdueAmount}
              />
              <Toggle
                name="attendanceParentSendOncePerSession"
                title="Send only once per session"
                description="Keep one parent alert for each attendance record."
                checked={settings.attendanceParentSendOncePerSession}
              />
              <Toggle
                name="attendanceParentSendOnPresent"
                title="Send on present"
                description="Trigger alerts for students marked present."
                checked={settings.attendanceParentSendOnPresent}
              />
              <Toggle
                name="attendanceParentSendOnLate"
                title="Send on late"
                description="Trigger alerts for students marked late."
                checked={settings.attendanceParentSendOnLate}
              />
            </div>
            <Field label="Custom message template" htmlFor="attendanceParentMessageTemplate">
              <Textarea
                id="attendanceParentMessageTemplate"
                name="attendanceParentMessageTemplate"
                defaultValue={settings.attendanceParentMessageTemplate ?? ""}
                placeholder="{{studentName}} has arrived for {{className}} at {{branchName}} today at {{attendanceTime}}. {{paymentSummary}}"
              />
            </Field>
            <p className="text-xs leading-5 text-muted-foreground">
              Variables: {"{{studentName}}"}, {"{{className}}"}, {"{{branchName}}"}, {"{{teacherName}}"}, {"{{attendanceTime}}"}, {"{{pendingTotal}}"}, {"{{nearestDueDate}}"}.
            </p>
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

function Toggle({ name, title, description, checked }: { name: string; title: string; description: string; checked: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border bg-white/70 p-4 text-sm">
      <Checkbox name={name} defaultChecked={checked} />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
