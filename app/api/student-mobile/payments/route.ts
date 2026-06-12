import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId } = await requireStudentMobileUser(request);
    const payments = await prisma.payment.findMany({
      where: { studentId },
      include: { classGroup: true, receipts: true },
      orderBy: { dueDate: "desc" }
    });

    return NextResponse.json({
      ok: true,
      pendingAmount: payments.filter((payment) => payment.status !== "PAID").reduce((sum, payment) => sum + Number(payment.balance), 0),
      payments: payments.map((payment) => ({
        id: payment.id,
        invoiceNo: payment.invoiceNo,
        className: payment.classGroup?.name ?? "General",
        month: payment.month,
        type: payment.type,
        amount: Number(payment.amount),
        paidAmount: Number(payment.paidAmount),
        balance: Number(payment.balance),
        status: payment.status,
        dueDate: payment.dueDate.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        receipts: payment.receipts.map((receipt) => ({
          id: receipt.id,
          receiptNo: receipt.receiptNo,
          amount: Number(receipt.amount),
          issuedAt: receipt.issuedAt.toISOString()
        }))
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load payments." }, { status: 500 });
  }
}
