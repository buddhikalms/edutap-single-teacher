"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentSlipUpload } from "@/components/payments/payment-slip-upload";

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
  const [step, setStep] = useState(1);
  const [gradeId, setGradeId] = useState(initialClass?.gradeId ?? "");
  const [classGroupId, setClassGroupId] = useState(initialClass?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMade, setPaymentMade] = useState<"yes" | "no">("no");
  const [sent, setSent] = useState(false);
  const filteredClasses = useMemo(() => classes.filter((item) => item.gradeId === gradeId), [classes, gradeId]);
  const grades = useMemo(() => Array.from(new Map(classes.map((item) => [item.gradeId, item.grade])).entries()), [classes]);

  function changeGrade(value: string) {
    setGradeId(value);
    setClassGroupId(classes.find((item) => item.gradeId === value)?.id ?? "");
  }

  async function submit(formData: FormData) {
    if (formData.get("password") !== formData.get("confirmPassword")) {
      toast.error("Passwords do not match.");
      setStep(1);
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
    return <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-emerald-950">
      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      <h3 className="mt-4 text-xl font-semibold">EduTap Account created</h3>
      <p className="mt-2 leading-7">Your enrollment request is pending teacher approval. You can sign in after it is approved.</p>
    </div>;
  }

  return <form action={submit} className="space-y-5">
    <div className="grid grid-cols-5 gap-2" aria-label={`Step ${step} of 5`}>
      {["Account", "Student", "Class", "Payment", "Review"].map((label, index) => <div key={label}>
        <div className={`h-1.5 rounded-full ${step >= index + 1 ? "bg-primary" : "bg-muted"}`} />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{label}</p>
      </div>)}
    </div>

    <section className={step === 1 ? "space-y-4" : "hidden"}>
      <div><h3 className="text-lg font-semibold">Parent login details</h3><p className="text-sm text-muted-foreground">One EduTap Account for the parent and all linked students.</p></div>
      <Field label="Parent / guardian full name"><Input name="parentName" autoComplete="name" required /></Field>
      <Field label="Parent mobile"><Input name="parentMobile" inputMode="tel" autoComplete="tel" required /></Field>
      <Field label="Parent email (optional)"><Input name="parentEmail" type="email" autoComplete="email" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password"><Input name="password" type="password" minLength={8} autoComplete="new-password" required /></Field>
        <Field label="Confirm password"><Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></Field>
      </div>
      <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
      <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t"><span className="relative bg-white px-3">or</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: `/family/register/google?classGroupId=${encodeURIComponent(classGroupId)}` })}>
        Continue with Google
      </Button>
    </section>

    <section className={step === 2 ? "space-y-4" : "hidden"}>
      <div><h3 className="text-lg font-semibold">Student details</h3><p className="text-sm text-muted-foreground">You can add more linked students later.</p></div>
      <Field label="Student name"><Input name="studentName" autoComplete="name" required /></Field>
      <Field label="Student mobile (optional)"><Input name="studentMobile" inputMode="tel" autoComplete="tel" /></Field>
    </section>

    <section className={step === 3 ? "space-y-4" : "hidden"}>
      <div><h3 className="text-lg font-semibold">Select class</h3><p className="text-sm text-muted-foreground">Choose the student grade and requested class.</p></div>
      <Field label="Student grade"><Select name="gradeId" value={gradeId} onChange={(event) => changeGrade(event.target.value)} required>
        {grades.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </Select></Field>
      <Field label="Selected class"><Select name="classGroupId" value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)} required>
        {filteredClasses.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.name} · {item.schedule}</option>)}
      </Select></Field>
      <Field label="Message to the teacher (optional)"><Textarea name="message" rows={3} /></Field>
    </section>

    <section className={step === 4 ? "space-y-4" : "hidden"}>
      <div><h3 className="text-lg font-semibold">Payment details</h3><p className="text-sm text-muted-foreground">Already paid manually? Send the slip with this request for faster review.</p></div>
      <fieldset className="space-y-2">
        <Label>Payment made?</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["yes", "no"] as const).map((value) => <label key={value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border p-4 font-medium transition ${paymentMade === value ? "border-primary bg-primary/5 text-primary" : "bg-white"}`}>
            <input className="sr-only" type="radio" name="paymentMade" value={value} checked={paymentMade === value} onChange={() => setPaymentMade(value)} />
            {value === "yes" ? <CreditCard className="h-4 w-4" /> : null}{value === "yes" ? "Yes, already paid" : "No, not yet"}
          </label>)}
        </div>
      </fieldset>
      {paymentMade === "yes" ? <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid amount"><Input name="paidAmount" type="number" min="0.01" step="0.01" required /></Field>
          <Field label="Payment method"><Select name="paymentMethod" required defaultValue="BANK_TRANSFER">
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH_DEPOSIT">Cash deposit</option>
            <option value="ONLINE_TRANSFER">Online transfer</option>
            <option value="OTHER">Other</option>
          </Select></Field>
          <Field label="Payment date"><Input name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Reference number (optional)"><Input name="referenceNumber" maxLength={120} /></Field>
        </div>
        <div className="space-y-2"><Label>Payment slip</Label><PaymentSlipUpload required /></div>
      </div> : <div className="rounded-2xl border border-dashed bg-slate-50 p-5 text-sm text-muted-foreground">No payment details will be attached. The teacher can still approve the enrollment.</div>}
    </section>

    <section className={step === 5 ? "space-y-4" : "hidden"}>
      <div><h3 className="text-lg font-semibold">Submit request</h3><p className="text-sm text-muted-foreground">Your EduTap Account remains locked until the teacher approves this enrollment.</p></div>
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-muted/35 p-4 text-sm leading-6">
        <Checkbox name="agreement" value="true" required className="mt-1" />
        <span>I confirm these details are correct and agree to be contacted about this enrollment request.</span>
      </label>
    </section>

    <div className="flex gap-3">
      {step > 1 ? <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((value) => value - 1)}><ChevronLeft className="h-4 w-4" />Back</Button> : null}
      {step < 5
        ? <Button type="button" className="flex-1" onClick={() => setStep((value) => value + 1)}>Continue<ChevronRight className="h-4 w-4" /></Button>
        : <Button type="submit" className="flex-1" disabled={submitting || !classes.length}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit enrollment request</Button>}
    </div>
    {submitting ? <div className="space-y-1" aria-live="polite"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div><p className="text-center text-xs text-muted-foreground">Securely uploading and creating your request…</p></div> : null}
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
