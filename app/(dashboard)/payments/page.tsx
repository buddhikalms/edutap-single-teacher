import { PaymentDashboard, type PaymentDashboardData } from "@/components/payments/payment-dashboard";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function rangeStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleDateString("en-US", { month: "short" })
    };
  });
}

export default async function PaymentsPage() {
  const { instituteId } = await getTenantContext();
  const now = new Date();
  const todayStart = rangeStart(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentMonth = monthKey(now);
  const months = lastSixMonths();

  const [monthlyPayments, todayPayments, pendingPayments, overduePayments, recentPayments, students, chartPayments] =
    await Promise.all([
      prisma.payment.findMany({ where: { instituteId, month: currentMonth, status: { not: "CANCELLED" } } }),
      prisma.payment.findMany({ where: { instituteId, paidAt: { gte: todayStart, lt: tomorrow }, status: { not: "CANCELLED" } } }),
      prisma.payment.findMany({ where: { instituteId, status: { in: ["PENDING", "PARTIAL"] } } }),
      prisma.payment.findMany({ where: { instituteId, OR: [{ status: "OVERDUE" }, { balance: { gt: 0 }, dueDate: { lt: now } }] } }),
      prisma.payment.findMany({
        where: { instituteId },
        include: { student: true, receipts: { orderBy: { issuedAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.student.findMany({
        where: { instituteId },
        include: { payments: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
      }),
      prisma.payment.findMany({
        where: { instituteId, month: { in: months.map((month) => month.key) }, status: { not: "CANCELLED" } }
      })
    ]);

  const chart: PaymentDashboardData["chart"] = months.map((month) => ({
    month: month.label,
    income: chartPayments.filter((payment) => payment.month === month.key).reduce((total, payment) => total + Number(payment.paidAmount), 0)
  }));

  const data: PaymentDashboardData = {
    monthlyIncome: monthlyPayments.reduce((total, payment) => total + Number(payment.paidAmount), 0),
    todayCollections: todayPayments.reduce((total, payment) => total + Number(payment.paidAmount), 0),
    pendingPayments: pendingPayments.reduce((total, payment) => total + Number(payment.balance), 0),
    overduePayments: overduePayments.reduce((total, payment) => total + Number(payment.balance), 0),
    chart,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      receiptId: payment.receipts[0]?.id ?? null,
      studentId: payment.studentId,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      invoiceNo: payment.invoiceNo,
      status: payment.status,
      paidAmount: Number(payment.paidAmount),
      balance: Number(payment.balance),
      method: payment.method,
      paidAt: payment.paidAt?.toISOString() ?? null
    })),
    students: students.map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      pending: student.payments
        .filter((payment) => payment.status !== "PAID" && payment.status !== "CANCELLED")
        .reduce((total, payment) => total + Number(payment.balance), 0)
    }))
  };

  return <PaymentDashboard data={data} />;
}
