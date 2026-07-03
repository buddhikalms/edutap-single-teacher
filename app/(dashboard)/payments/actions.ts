"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createReceiptNotification } from "@/lib/notifications";
import { nextInvoiceNo, nextReceiptNo, paymentDueDate, paymentStatus } from "@/lib/payments";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { duePaymentSchema, paymentSchema, type DuePaymentInput, type PaymentInput } from "@/lib/validations";

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000`);
}

async function assertStudent(instituteId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    select: { id: true }
  });

  if (!student) {
    throw new Error("Invalid student.");
  }
}

async function assertClass(instituteId: string, classGroupId?: string) {
  if (!classGroupId) {
    return;
  }

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classGroupId, instituteId },
    select: { id: true }
  });

  if (!classGroup) {
    throw new Error("Invalid class.");
  }
}

async function maybeCreateReceipt(input: {
  instituteId: string;
  paymentId: string;
  paidAmount: number;
  receivedBy?: string;
}) {
  if (input.paidAmount <= 0) {
    return null;
  }

  return prisma.receipt.create({
    data: {
      receiptNo: await nextReceiptNo(input.instituteId),
      amount: input.paidAmount,
      paymentId: input.paymentId,
      instituteId: input.instituteId,
      receivedBy: input.receivedBy ?? null
    }
  });
}

export async function createPayment(input: PaymentInput): Promise<ActionState & { receiptId?: string; paymentId?: string }> {
  try {
    const { instituteId, userName } = await getTenantContext();
    const parsed = paymentSchema.parse(input);
    await assertStudent(instituteId, parsed.studentId);
    await assertClass(instituteId, parsed.classGroupId);

    const dueDate = toDate(parsed.dueDate);
    const computed = paymentStatus(parsed.amount, parsed.discount, parsed.paidAmount, dueDate);

    const payment = await prisma.payment.create({
      data: {
        invoiceNo: await nextInvoiceNo(instituteId),
        type: parsed.type as PaymentType,
        month: parsed.month,
        amount: parsed.amount,
        discount: parsed.discount,
        paidAmount: parsed.paidAmount,
        balance: computed.balance,
        dueDate,
        paidAt: parsed.paidAmount > 0 ? new Date() : null,
        status: computed.status,
        method: parsed.method as PaymentMethod | undefined,
        note: parsed.note ?? null,
        receivedBy: parsed.receivedBy ?? userName,
        instituteId,
        studentId: parsed.studentId,
        classGroupId: parsed.classGroupId ?? null
      }
    });

    const receipt = await maybeCreateReceipt({
      instituteId,
      paymentId: payment.id,
      paidAmount: parsed.paidAmount,
      receivedBy: parsed.receivedBy ?? userName
    });

    if (receipt) {
      await createReceiptNotification({
        instituteId,
        receiptId: receipt.id,
        studentId: parsed.studentId,
        amount: Number(receipt.amount),
        receiptNo: receipt.receiptNo
      });
    }

    revalidatePath("/payments");
    revalidatePath("/payments/dues");
    revalidatePath("/payments/reports");
    revalidatePath(`/payments/students/${parsed.studentId}`);
    revalidatePath("/attendance");
    return { ok: true, message: "Payment saved successfully.", receiptId: receipt?.id, paymentId: payment.id };
  } catch (error) {
    return actionError(error, "Could not save payment.");
  }
}

export async function markDuePayment(input: DuePaymentInput): Promise<ActionState & { receiptId?: string; paymentId?: string }> {
  try {
    const { instituteId, userName } = await getTenantContext();
    const parsed = duePaymentSchema.parse(input);
    await assertStudent(instituteId, parsed.studentId);
    await assertClass(instituteId, parsed.classGroupId);

    const classGroup = await prisma.classGroup.findFirstOrThrow({
      where: { id: parsed.classGroupId, instituteId },
      include: { subject: true }
    });
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classGroupId: {
          studentId: parsed.studentId,
          classGroupId: parsed.classGroupId
        }
      },
      select: { monthlyFeeOverride: true, discount: true }
    });
    const dueDate = paymentDueDate(parsed.month, classGroup.defaultPaymentDueDay);
    const amount = Number(enrollment?.monthlyFeeOverride ?? classGroup.monthlyFee ?? 0);
    const computed = paymentStatus(amount, parsed.discount, parsed.paidAmount, dueDate);

    const existing = await prisma.payment.findFirst({
      where: {
        instituteId,
        studentId: parsed.studentId,
        classGroupId: parsed.classGroupId,
        month: parsed.month,
        type: "MONTHLY_FEE"
      }
    });

    const payment = existing
      ? await prisma.payment.update({
          where: { id: existing.id },
          data: {
            amount,
            discount: parsed.discount,
            paidAmount: Number(existing.paidAmount) + parsed.paidAmount,
            balance: Math.max(0, amount - parsed.discount - (Number(existing.paidAmount) + parsed.paidAmount)),
            status: paymentStatus(amount, parsed.discount, Number(existing.paidAmount) + parsed.paidAmount, dueDate).status,
            method: parsed.method as PaymentMethod,
            paidAt: new Date(),
            note: parsed.note ?? existing.note,
            receivedBy: parsed.receivedBy ?? userName
          }
        })
      : await prisma.payment.create({
          data: {
            invoiceNo: await nextInvoiceNo(instituteId),
            type: "MONTHLY_FEE",
            month: parsed.month,
            amount,
            discount: parsed.discount,
            paidAmount: parsed.paidAmount,
            balance: computed.balance,
            dueDate,
            paidAt: parsed.paidAmount > 0 ? new Date() : null,
            status: computed.status,
            method: parsed.method as PaymentMethod,
            note: parsed.note ?? null,
            receivedBy: parsed.receivedBy ?? userName,
            instituteId,
            studentId: parsed.studentId,
            classGroupId: parsed.classGroupId
          }
        });

    const receipt = await maybeCreateReceipt({
      instituteId,
      paymentId: payment.id,
      paidAmount: parsed.paidAmount,
      receivedBy: parsed.receivedBy ?? userName
    });

    if (receipt) {
      await createReceiptNotification({
        instituteId,
        receiptId: receipt.id,
        studentId: parsed.studentId,
        amount: Number(receipt.amount),
        receiptNo: receipt.receiptNo
      });
    }

    revalidatePath("/payments");
    revalidatePath("/payments/dues");
    revalidatePath("/payments/reports");
    revalidatePath(`/payments/students/${parsed.studentId}`);
    revalidatePath("/attendance");
    return { ok: true, message: "Due payment updated.", receiptId: receipt?.id, paymentId: payment.id };
  } catch (error) {
    return actionError(error, "Could not update due payment.");
  }
}

export async function cancelPayment(paymentId: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, instituteId },
      select: { id: true, studentId: true }
    });

    if (!payment) {
      return { ok: false, message: "Payment was not found." };
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "CANCELLED" }
    });

    revalidatePath("/payments");
    revalidatePath("/payments/dues");
    revalidatePath("/payments/reports");
    revalidatePath(`/payments/students/${payment.studentId}`);
    revalidatePath("/attendance");
    return { ok: true, message: "Payment cancelled." };
  } catch (error) {
    return actionError(error, "Could not cancel payment.");
  }
}
