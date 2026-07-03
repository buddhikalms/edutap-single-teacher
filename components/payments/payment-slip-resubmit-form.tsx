"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PaymentSlipUpload } from "@/components/payments/payment-slip-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function PaymentSlipResubmitForm({
  enrollmentRequestId,
  paidAmount,
  paymentMethod,
  paymentDate,
  referenceNumber
}: {
  enrollmentRequestId: string;
  paidAmount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/family/enrollment-payment-slip", { method: "POST", body: formData });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      toast.error(result?.message ?? "Could not upload the new slip.");
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return <form action={submit} className="mt-5 space-y-4 rounded-2xl border bg-white p-4 text-left">
    <input type="hidden" name="enrollmentRequestId" value={enrollmentRequestId} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Paid amount"><Input name="paidAmount" type="number" min="0.01" step="0.01" defaultValue={paidAmount} required /></Field>
      <Field label="Payment method"><Select name="paymentMethod" defaultValue={paymentMethod} required><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH_DEPOSIT">Cash deposit</option><option value="ONLINE_TRANSFER">Online transfer</option><option value="OTHER">Other</option></Select></Field>
      <Field label="Payment date"><Input name="paymentDate" type="date" defaultValue={paymentDate} max={new Date().toISOString().slice(0, 10)} required /></Field>
      <Field label="Reference number (optional)"><Input name="referenceNumber" defaultValue={referenceNumber} maxLength={120} /></Field>
    </div>
    <div className="space-y-2"><Label>Replacement slip</Label><PaymentSlipUpload required disabled={loading} /></div>
    <Button className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Resubmit payment slip</Button>
    {loading ? <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div> : null}
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
