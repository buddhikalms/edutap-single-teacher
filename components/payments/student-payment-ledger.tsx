"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cancelPayment, createPayment } from "@/app/(dashboard)/payments/actions";
import { FieldRow, FormField, FormShell } from "@/components/forms/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentSchema, type PaymentInput } from "@/lib/validations";
import { formatCurrency, cn } from "@/lib/utils";

export type StudentPaymentRow = {
  id: string;
  invoiceNo: string;
  type: string;
  month: string | null;
  amount: number;
  discount: number;
  paidAmount: number;
  balance: number;
  status: string;
  method: string | null;
  dueDate: string;
  paidAt: string | null;
  receiptIds: string[];
};

export type PaymentClassOption = {
  id: string;
  name: string;
  fee: number;
};

export function StudentPaymentLedger({
  student,
  classes,
  payments,
  currency
}: {
  student: { id: string; name: string; admissionNo: string };
  classes: PaymentClassOption[];
  payments: StudentPaymentRow[];
  currency: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: student.id,
      classGroupId: classes[0]?.id,
      month: currentMonth,
      type: "MONTHLY_FEE",
      amount: classes[0]?.fee ?? 0,
      discount: 0,
      paidAmount: 0,
      dueDate: `${currentMonth}-10`,
      method: "CASH",
      note: undefined,
      receivedBy: undefined
    }
  });

  const amount = Number(useWatch({ control: form.control, name: "amount" }) ?? 0);
  const discount = Number(useWatch({ control: form.control, name: "discount" }) ?? 0);
  const paidAmount = Number(useWatch({ control: form.control, name: "paidAmount" }) ?? 0);
  const balance = Math.max(0, amount - discount - paidAmount);

  const totals = useMemo(
    () => ({
      paid: payments.reduce((total, payment) => total + payment.paidAmount, 0),
      balance: payments
        .filter((payment) => payment.status !== "CANCELLED")
        .reduce((total, payment) => total + payment.balance, 0)
    }),
    [payments]
  );

  function submit(values: PaymentInput) {
    startTransition(async () => {
      const result = await createPayment(values);
      if (result.ok) {
        toast.success(result.message);
        setShowForm(false);
        router.refresh();
        if (result.receiptId) {
          router.push(`/payments/receipts/${result.receiptId}`);
        }
      } else {
        toast.error(result.message);
      }
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      const result = await cancelPayment(id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <Badge variant="secondary">Student payment ledger</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{student.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{student.admissionNo}</p>
          </div>
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" />
            Add payment
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Summary title="Total paid" value={formatCurrency(totals.paid, currency)} tone="success" />
        <Summary title="Outstanding balance" value={formatCurrency(totals.balance, currency)} tone={totals.balance > 0 ? "warning" : "success"} />
      </section>

      {showForm ? (
        <FormShell title="Add new payment" description="Select class, month, type, amount, discount, paid amount, method, and notes.">
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FieldRow>
              <FormField label="Class / course" error={form.formState.errors.classGroupId?.message}>
                <Select
                  {...form.register("classGroupId")}
                  onChange={(event) => {
                    form.setValue("classGroupId", event.target.value);
                    const selected = classes.find((item) => item.id === event.target.value);
                    if (selected) {
                      form.setValue("amount", selected.fee, { shouldValidate: true });
                    }
                  }}
                >
                  <option value="">No class</option>
                  {classes.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Month" error={form.formState.errors.month?.message}>
                <Input type="month" {...form.register("month")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Payment type" error={form.formState.errors.type?.message}>
                <Select {...form.register("type")}>
                  <option value="MONTHLY_FEE">Monthly fee</option>
                  <option value="ADMISSION_FEE">Admission fee</option>
                  <option value="EXAM_FEE">Exam fee</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
              <FormField label="Due date" error={form.formState.errors.dueDate?.message}>
                <Input type="date" {...form.register("dueDate")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Amount" error={form.formState.errors.amount?.message}>
                <Input type="number" step="0.01" {...form.register("amount")} />
              </FormField>
              <FormField label="Discount" error={form.formState.errors.discount?.message}>
                <Input type="number" step="0.01" {...form.register("discount")} />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Paid amount" error={form.formState.errors.paidAmount?.message}>
                <Input type="number" step="0.01" {...form.register("paidAmount")} />
              </FormField>
              <FormField label="Balance">
                <Input value={formatCurrency(balance, currency)} readOnly />
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField label="Payment method" error={form.formState.errors.method?.message}>
                <Select {...form.register("method")}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                </Select>
              </FormField>
              <FormField label="Received by" error={form.formState.errors.receivedBy?.message}>
                <Input {...form.register("receivedBy")} />
              </FormField>
            </FieldRow>
            <FormField label="Notes" error={form.formState.errors.note?.message}>
              <Textarea {...form.register("note")} />
            </FormField>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save payment
              </Button>
            </div>
          </form>
        </FormShell>
      ) : null}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length ? (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-xl border bg-white/72 p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                  <div>
                    <p className="font-semibold">{payment.invoiceNo}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.type.replaceAll("_", " ").toLowerCase()} · {payment.month ?? "no month"} · due {payment.dueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Amount label="Amount" value={payment.amount} currency={currency} />
                    <Amount label="Paid" value={payment.paidAmount} currency={currency} />
                    <Amount label="Balance" value={payment.balance} currency={currency} />
                    <Badge variant={payment.status === "PAID" ? "success" : payment.status === "OVERDUE" ? "warning" : "outline"}>
                      {payment.status.toLowerCase()}
                    </Badge>
                    {payment.receiptIds.map((receiptId) => (
                      <Button key={receiptId} asChild variant="outline" size="sm">
                        <Link href={`/payments/receipts/${receiptId}`}>
                          <ReceiptText className="h-4 w-4" />
                          Receipt
                        </Link>
                      </Button>
                    ))}
                    {payment.status !== "CANCELLED" ? (
                      <Button variant="ghost" size="icon" onClick={() => cancel(payment.id)} aria-label="Cancel payment">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
              <p className="font-semibold">No payment history</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the first payment for this student.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ title, value, tone }: { title: string; value: string; tone: "success" | "warning" }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("mt-2 text-3xl font-semibold", tone === "success" ? "text-emerald-700" : "text-amber-700")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Amount({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="min-w-20">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatCurrency(value, currency)}</p>
    </div>
  );
}
