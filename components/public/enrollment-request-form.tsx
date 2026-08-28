"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, CreditCard, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PaymentSlipUpload } from "@/components/payments/payment-slip-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ClassOption = {
  id: string;
  name: string;
  gradeId: string;
  grade: string;
  subject: string;
  schedule: string;
};

export function EnrollmentRequestForm({ classes, selectedClassId }: { classes: ClassOption[]; selectedClassId?: string; compact?: boolean }) {
  const initialClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
  const [gradeId, setGradeId] = useState(initialClass?.gradeId ?? "");
  const [classGroupId, setClassGroupId] = useState(initialClass?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMade, setPaymentMade] = useState<"yes" | "no">("no");
  const [sent, setSent] = useState(false);
  const filteredClasses = useMemo(() => classes.filter((item) => item.gradeId === gradeId), [classes, gradeId]);
  const grades = useMemo(() => Array.from(new Map(classes.map((item) => [item.gradeId, item.grade])).entries()), [classes]);
  const selectedClass = classes.find((item) => item.id === classGroupId);

  function changeGrade(value: string) {
    setGradeId(value);
    setClassGroupId(classes.find((item) => item.gradeId === value)?.id ?? "");
  }

  async function submit(formData: FormData) {
    if (formData.get("password") !== formData.get("confirmPassword")) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/public/enrollment-requests", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(result?.message ?? "Could not send your enrollment request.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-emerald-950">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        <h3 className="mt-4 text-xl font-semibold">Enrollment request sent</h3>
        <p className="mt-2 leading-7">Your request is pending teacher approval. The parent account can sign in after it is approved.</p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-5">
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <FormSection number="1" title="Class details" description="Choose the class you want to enroll the student in.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student grade" required>
            <Select name="gradeId" value={gradeId} onChange={(event) => changeGrade(event.target.value)} required>
              {grades.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" required>
            <Select name="classGroupId" value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)} required>
              {filteredClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject} - {item.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {selectedClass ? (
          <div className="rounded-xl border bg-primary/5 p-4 text-sm">
            <p className="font-semibold">
              {selectedClass.subject} - {selectedClass.name}
            </p>
            <p className="mt-1 text-muted-foreground">
              {selectedClass.grade} - {selectedClass.schedule}
            </p>
          </div>
        ) : null}
      </FormSection>

      <FormSection number="2" title="Student details" description="Enter the student information needed for enrollment.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student full name" required>
            <Input name="studentName" autoComplete="name" required />
          </Field>
          <Field label="Student mobile">
            <Input name="studentMobile" inputMode="tel" autoComplete="tel" placeholder="Optional" />
          </Field>
        </div>
        <Field label="Message to the teacher">
          <Textarea name="message" rows={3} placeholder="Optional note about the student, preferred batch, or learning goals" />
        </Field>
      </FormSection>

      <FormSection number="3" title="Parent details" description="These details create the parent account after teacher approval.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Parent / guardian full name" required>
            <Input name="parentName" autoComplete="name" required />
          </Field>
          <Field label="Parent mobile" required>
            <Input name="parentMobile" inputMode="tel" autoComplete="tel" required />
          </Field>
          <Field label="Parent email">
            <Input name="parentEmail" type="email" autoComplete="email" placeholder="Optional" />
          </Field>
          <div />
          <Field label="Password" required>
            <Input name="password" type="password" minLength={10} autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password" required>
            <Input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required />
          </Field>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Password must have at least 10 characters with uppercase, lowercase, number, and symbol.
        </p>
        <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t">
          <span className="relative bg-white px-3">or</span>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: `/family/register/google?classGroupId=${encodeURIComponent(classGroupId)}` })}>
          Continue with Google
        </Button>
      </FormSection>

      <FormSection number="4" title="Payment details" description="Optional. Attach a slip only if you have already paid.">
        <fieldset className="space-y-2">
          <Label>Payment made?</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["no", "yes"] as const).map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition ${
                  paymentMade === value ? "border-primary bg-primary/5 text-primary" : "bg-white"
                }`}
              >
                <input className="sr-only" type="radio" name="paymentMade" value={value} checked={paymentMade === value} onChange={() => setPaymentMade(value)} />
                {value === "yes" ? <CreditCard className="h-4 w-4" /> : null}
                {value === "yes" ? "Yes, already paid" : "No payment yet"}
              </label>
            ))}
          </div>
        </fieldset>

        {paymentMade === "yes" ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Paid amount" required>
                <Input name="paidAmount" type="number" min="0.01" step="0.01" required />
              </Field>
              <Field label="Payment method" required>
                <Select name="paymentMethod" required defaultValue="BANK_TRANSFER">
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH_DEPOSIT">Cash deposit</option>
                  <option value="ONLINE_TRANSFER">Online transfer</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Payment date" required>
                <Input name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} required />
              </Field>
              <Field label="Reference number">
                <Input name="referenceNumber" maxLength={120} placeholder="Optional" />
              </Field>
            </div>
            <div className="space-y-2">
              <Label>Payment slip</Label>
              <PaymentSlipUpload required />
            </div>
          </div>
        ) : null}
      </FormSection>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/35 p-4 text-sm leading-6">
        <Checkbox name="agreement" value="true" required className="mt-1" />
        <span>I confirm the class, student, and parent details are correct and agree to be contacted about this enrollment request.</span>
      </label>

      <Button type="submit" className="w-full" size="lg" disabled={submitting || !classes.length}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit enrollment request
      </Button>

      {submitting ? (
        <div className="space-y-1" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="text-center text-xs text-muted-foreground">Securely uploading and creating your request...</p>
        </div>
      ) : null}
    </form>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-white/72 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">{number}</span>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
