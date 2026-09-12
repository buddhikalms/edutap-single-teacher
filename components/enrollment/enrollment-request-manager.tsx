"use client";

import { useTransition } from "react";
import { Check, Download, FileCheck2, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  approveEnrollmentAndVerifyPayment,
  approveEnrollmentRequest,
  rejectEnrollmentPayment,
  rejectEnrollmentRequest,
  verifyEnrollmentPayment
} from "@/app/(dashboard)/dashboard/enrollment-requests/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RequestItem = {
  id: string;
  admissionNo: string;
  studentName: string;
  studentMobile: string | null;
  studentEmail: string | null;
  parentName: string;
  parentMobile: string;
  parentEmail: string | null;
  message: string | null;
  teacherNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED";
  createdAt: string;
  className: string;
  grade: string;
  subject: string;
  schedule: string;
  paymentStartDate: string;
  freePeriodType: "NONE" | "FIRST_WEEK" | "SECOND_WEEK" | "FIRST_MONTH" | "CUSTOM_DAYS";
  freeDays: number;
  paymentSlip: {
    id: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    paidAmount: number;
    paymentMethod: string;
    paymentDate: string;
    referenceNumber: string | null;
    status: "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
    teacherNote: string | null;
    receiptNo: string | null;
  } | null;
};

export function EnrollmentRequestManager({ requests }: { requests: RequestItem[] }) {
  const [pending, startTransition] = useTransition();

  function run(action: (id: string, data: FormData) => Promise<{ ok: boolean; message: string }>, id: string, form: HTMLFormElement) {
    startTransition(async () => {
      const result = await action(id, new FormData(form));
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (!requests.length) {
    return <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-muted-foreground">No enrollment requests match this view.</div>;
  }

  return <div className="grid gap-5">
    {requests.map((item) => <article key={item.id} className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2"><Badge>{item.status.toLowerCase()}</Badge><Badge variant="outline">{item.grade} · {item.subject}</Badge></div>
          <h2 className="mt-3 text-xl font-semibold">{item.studentName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.className} · {item.schedule}</p>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
      <div className="mt-5 grid gap-4 rounded-2xl bg-muted/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-muted-foreground">Student ID</p><p className="mt-1 font-medium">{item.admissionNo || "Auto-generated ID"}</p><p>{item.studentName}</p></div>
        <div><p className="text-muted-foreground">Parent / guardian</p><p className="mt-1 font-medium">{item.parentName}</p><p>{item.parentMobile} · {item.parentEmail || "No email"}</p></div>
        <div><p className="text-muted-foreground">Message</p><p className="mt-1">{item.message || "No additional message."}</p></div>
      </div>
      {item.paymentSlip ? <div className="mt-5 overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 p-4">
          <div><p className="text-sm font-semibold">Payment slip</p><p className="text-xs text-muted-foreground">{item.paymentSlip.fileName} · {(item.paymentSlip.fileSize / 1024 / 1024).toFixed(2)} MB</p></div>
          <Badge variant={item.paymentSlip.status === "VERIFIED" ? "success" : item.paymentSlip.status === "PENDING_REVIEW" ? "warning" : "outline"}>{item.paymentSlip.status.replaceAll("_", " ")}</Badge>
        </div>
        <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-64 overflow-hidden rounded-xl border bg-slate-100">
            {item.paymentSlip.fileType === "application/pdf"
              ? <iframe title={`Payment slip for ${item.studentName}`} src={item.paymentSlip.fileUrl} className="h-80 w-full bg-white" />
              : <>
                {/* Private authenticated images are intentionally not sent through Next's public image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.paymentSlip.fileUrl} alt={`Payment slip for ${item.studentName}`} className="h-80 w-full object-contain" />
              </>}
          </div>
          <div className="space-y-3 text-sm">
            <Detail label="Paid amount" value={item.paymentSlip.paidAmount.toLocaleString()} />
            <Detail label="Payment method" value={item.paymentSlip.paymentMethod.replaceAll("_", " ")} />
            <Detail label="Payment date" value={item.paymentSlip.paymentDate} />
            <Detail label="Reference" value={item.paymentSlip.referenceNumber || "Not provided"} />
            {item.paymentSlip.receiptNo ? <Detail label="Receipt" value={item.paymentSlip.receiptNo} /> : null}
            {item.paymentSlip.teacherNote ? <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Review note</p><p className="mt-1">{item.paymentSlip.teacherNote}</p></div> : null}
            <Button asChild variant="outline" size="sm"><a href={`${item.paymentSlip.fileUrl}?download=1`}><Download className="h-4 w-4" />Download original</a></Button>
          </div>
        </div>
      </div> : <div className="mt-5 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No payment was declared with this enrollment request.</div>}
      {item.status === "PENDING" || (item.status === "APPROVED" && item.paymentSlip?.status === "PENDING_REVIEW") ? <form className="mt-5 grid gap-3" onSubmit={(event) => event.preventDefault()}>
        <Textarea name="teacherNote" defaultValue={item.teacherNote || ""} placeholder="Teacher note (included in updates)" rows={2} />
        {item.status === "PENDING" ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm"><span className="font-medium">Student ID</span><Input name="admissionNo" defaultValue={item.admissionNo} required /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Payment start date</span><Input type="date" name="paymentStartDate" defaultValue={item.paymentStartDate} /></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Free period</span><Select name="freePeriodType" defaultValue={item.freePeriodType}>
            <option value="NONE">None</option>
            <option value="FIRST_WEEK">First week</option>
            <option value="SECOND_WEEK">Second week</option>
            <option value="FIRST_MONTH">First month</option>
            <option value="CUSTOM_DAYS">Custom days</option>
          </Select></label>
          <label className="grid gap-1 text-sm"><span className="font-medium">Free days</span><Input type="number" name="freeDays" min={0} max={365} defaultValue={item.freeDays} /></label>
        </div> : null}
        <div className="flex flex-wrap gap-2">
          {item.status === "PENDING" ? <Button type="button" disabled={pending} onClick={(event) => run(approveEnrollmentRequest, item.id, event.currentTarget.form!)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve and activate
          </Button> : null}
          {item.paymentSlip?.status === "PENDING_REVIEW" ? <Button type="button" disabled={pending} onClick={(event) => run(item.status === "PENDING" ? approveEnrollmentAndVerifyPayment : verifyEnrollmentPayment, item.id, event.currentTarget.form!)}>
            <ShieldCheck className="h-4 w-4" />{item.status === "PENDING" ? "Approve + verify payment" : "Verify payment"}
          </Button> : null}
          {item.paymentSlip?.status === "PENDING_REVIEW" ? <Button type="button" variant="outline" disabled={pending} onClick={(event) => run(rejectEnrollmentPayment, item.id, event.currentTarget.form!)}>
            <FileCheck2 className="h-4 w-4" />Reject slip & request new
          </Button> : null}
          {item.status === "PENDING" ? <Button type="button" variant="outline" disabled={pending} onClick={(event) => run(rejectEnrollmentRequest, item.id, event.currentTarget.form!)}>
            <X className="h-4 w-4" />Reject
          </Button> : null}
        </div>
      </form> : item.teacherNote ? <p className="mt-4 text-sm text-muted-foreground">Teacher note: {item.teacherNote}</p> : null}
    </article>)}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 font-medium capitalize">{value.toLowerCase()}</p></div>;
}
