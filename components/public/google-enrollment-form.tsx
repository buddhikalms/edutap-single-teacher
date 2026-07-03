"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentSlipUpload } from "@/components/payments/payment-slip-upload";

type Option = { id: string; name: string; gradeId: string; grade: string; subject: string };

export function GoogleEnrollmentForm({ classes, initialClassId }: { classes: Option[]; initialClassId?: string }) {
  const router = useRouter();
  const initial = classes.find((item) => item.id === initialClassId) ?? classes[0];
  const [gradeId, setGradeId] = useState(initial?.gradeId ?? "");
  const [classGroupId, setClassGroupId] = useState(initial?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [paymentMade, setPaymentMade] = useState<"yes" | "no">("no");
  const grades = Array.from(new Map(classes.map((item) => [item.gradeId, item.grade])).entries());

  async function submit(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/public/google-enrollment", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      toast.error(result?.message ?? "Could not submit enrollment.");
      return;
    }
    router.push("/family/pending");
    router.refresh();
  }

  return <form action={submit} className="space-y-4">
    <Field label="Parent mobile"><Input name="parentMobile" inputMode="tel" required /></Field>
    <Field label="Student name"><Input name="studentName" required /></Field>
    <Field label="Student mobile (optional)"><Input name="studentMobile" inputMode="tel" /></Field>
    <Field label="Student grade"><Select name="gradeId" value={gradeId} onChange={(event) => {
      setGradeId(event.target.value);
      setClassGroupId(classes.find((item) => item.gradeId === event.target.value)?.id ?? "");
    }}>{grades.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></Field>
    <Field label="Selected class"><Select name="classGroupId" value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)}>
      {classes.filter((item) => item.gradeId === gradeId).map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.name}</option>)}
    </Select></Field>
    <Field label="Message (optional)"><Textarea name="message" rows={3} /></Field>
    <fieldset className="space-y-2"><Label>Payment made?</Label><div className="grid grid-cols-2 gap-3">
      {(["yes", "no"] as const).map((value) => <label key={value} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-medium ${paymentMade === value ? "border-primary bg-primary/5 text-primary" : ""}`}>
        <input className="sr-only" type="radio" name="paymentMade" value={value} checked={paymentMade === value} onChange={() => setPaymentMade(value)} />{value === "yes" ? "Yes, already paid" : "No, not yet"}
      </label>)}
    </div></fieldset>
    {paymentMade === "yes" ? <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paid amount"><Input name="paidAmount" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Payment method"><Select name="paymentMethod" defaultValue="BANK_TRANSFER" required><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH_DEPOSIT">Cash deposit</option><option value="ONLINE_TRANSFER">Online transfer</option><option value="OTHER">Other</option></Select></Field>
        <Field label="Payment date"><Input name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} required /></Field>
        <Field label="Reference number (optional)"><Input name="referenceNumber" maxLength={120} /></Field>
      </div>
      <div className="space-y-2"><Label>Payment slip</Label><PaymentSlipUpload required /></div>
    </div> : null}
    <Button className="w-full" size="lg" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Submit for teacher approval</Button>
    {loading ? <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div> : null}
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
