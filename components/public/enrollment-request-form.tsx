"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, CalendarClock, CheckCircle2, CreditCard, Loader2, Send, ShieldCheck, UserRound, UsersRound } from "lucide-react";
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

  if (!classes.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/80 p-8 text-center">
        <BookOpenCheck className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No classes are accepting requests</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Please check again later or contact the teacher directly.</p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-5">
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div className="grid gap-3 rounded-2xl border bg-slate-950 p-4 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Selected class</p>
          <h3 className="mt-2 truncate text-xl font-semibold">{selectedClass ? `${selectedClass.subject} - ${selectedClass.name}` : "Choose a class"}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-white/70">
            <CalendarClock className="h-4 w-4 shrink-0 text-teal-200" />
            <span className="truncate">{selectedClass ? `${selectedClass.grade} - ${selectedClass.schedule}` : "Class schedule will appear here"}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:w-44">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="font-semibold">{grades.length}</p>
            <p className="mt-1 text-white/60">Grades</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="font-semibold">{classes.length}</p>
            <p className="mt-1 text-white/60">Classes</p>
          </div>
        </div>
      </div>

      <FormSection icon={<BookOpenCheck className="h-4 w-4" />} title="Class details" description="Choose the class you want to enroll the student in.">
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
      </FormSection>

      <FormSection icon={<UserRound className="h-4 w-4" />} title="Student details" description="Enter the student information needed for enrollment.">
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

      <FormSection icon={<UsersRound className="h-4 w-4" />} title="Parent details" description="These details create the parent account after teacher approval.">
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
      </FormSection>

      <FormSection icon={<CreditCard className="h-4 w-4" />} title="Payment details" description="Optional. Attach a slip only if you have already paid.">
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
        <span className="flex-1">I confirm the class, student, and parent details are correct and agree to be contacted about this enrollment request.</span>
        <ShieldCheck className="mt-1 hidden h-4 w-4 shrink-0 text-emerald-600 sm:block" />
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

function FormSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-white/82 p-4 shadow-sm shadow-slate-200/50 sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">{icon}</span>
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
