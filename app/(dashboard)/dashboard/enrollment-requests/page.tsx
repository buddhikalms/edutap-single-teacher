import Link from "next/link";
import { EnrollmentRequestManager } from "@/components/enrollment/enrollment-request-manager";
import { Badge } from "@/components/ui/badge";
import { getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EnrollmentRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { instituteId } = await getTenantContext();
  const { status } = await searchParams;
  const allowed = ["PENDING", "APPROVED", "REJECTED", "CONVERTED"] as const;
  const selected = allowed.find((value) => value === status);
  const [requests, counts] = await Promise.all([
    prisma.enrollmentRequest.findMany({
      where: { instituteId, ...(selected ? { status: selected } : {}) },
      include: {
        classGroup: true,
        grade: true,
        subject: true,
        paymentSlip: { include: { payment: { include: { receipts: { orderBy: { issuedAt: "desc" }, take: 1 } } } } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.enrollmentRequest.groupBy({ by: ["status"], where: { instituteId }, _count: true })
  ]);
  const countMap = Object.fromEntries(counts.map((item) => [item.status, item._count]));

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">Admissions</p><h1 className="mt-1 text-3xl font-semibold">Enrollment requests</h1><p className="mt-2 text-muted-foreground">Review family details, assign the student ID and payment terms, then activate both accounts with one approval.</p></div><Badge variant="secondary">{countMap.PENDING || 0} awaiting review</Badge></div>
    <div className="my-7 flex flex-wrap gap-2"><Link href="/dashboard/enrollment-requests" className={`rounded-full border px-4 py-2 text-sm font-medium ${!selected ? "bg-primary text-white" : "bg-white"}`}>All</Link>{allowed.map((value) => <Link key={value} href={`/dashboard/enrollment-requests?status=${value}`} className={`rounded-full border px-4 py-2 text-sm font-medium ${selected === value ? "bg-primary text-white" : "bg-white"}`}>{value.toLowerCase()} ({countMap[value] || 0})</Link>)}</div>
    <EnrollmentRequestManager requests={requests.map((item) => ({ id: item.id, studentName: item.studentName, studentMobile: item.studentMobile, studentEmail: item.studentEmail, parentName: item.parentName, parentMobile: item.parentMobile, parentEmail: item.parentEmail, message: item.message, teacherNote: item.teacherNote, status: item.status, createdAt: item.createdAt.toISOString(), className: item.classGroup.name, grade: item.grade.name, subject: item.subject.name, schedule: item.classGroup.schedule, paymentStartDate: item.classGroup.paymentStartDate?.toISOString().slice(0, 10) ?? "", freePeriodType: item.classGroup.defaultFreePeriodType, freeDays: item.classGroup.defaultFreeDays, paymentSlip: item.paymentSlip ? { id: item.paymentSlip.id, fileUrl: item.paymentSlip.fileUrl, fileName: item.paymentSlip.fileName, fileType: item.paymentSlip.fileType, fileSize: item.paymentSlip.fileSize, paidAmount: Number(item.paymentSlip.paidAmount), paymentMethod: item.paymentSlip.paymentMethod, paymentDate: item.paymentSlip.paymentDate.toISOString().slice(0, 10), referenceNumber: item.paymentSlip.referenceNumber, status: item.paymentSlip.status, teacherNote: item.paymentSlip.teacherNote, receiptNo: item.paymentSlip.payment?.receipts[0]?.receiptNo ?? null } : null }))} />
  </div>;
}
