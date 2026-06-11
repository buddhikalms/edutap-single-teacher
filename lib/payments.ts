import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function paymentStatus(amount: number, discount: number, paidAmount: number, dueDate: Date) {
  const netAmount = Math.max(0, amount - discount);
  const balance = Math.max(0, netAmount - paidAmount);

  if (balance <= 0 && paidAmount > 0) {
    return { status: PaymentStatus.PAID, balance };
  }

  if (paidAmount > 0 && balance > 0) {
    return { status: PaymentStatus.PARTIAL, balance };
  }

  if (dueDate < new Date()) {
    return { status: PaymentStatus.OVERDUE, balance };
  }

  return { status: PaymentStatus.PENDING, balance };
}

function numberSuffix(value: number) {
  return String(value).padStart(5, "0");
}

export async function nextInvoiceNo(instituteId: string) {
  const count = await prisma.payment.count({ where: { instituteId } });
  return `INV-${new Date().getFullYear()}-${numberSuffix(count + 1)}`;
}

export async function nextReceiptNo(instituteId: string) {
  const count = await prisma.receipt.count({ where: { instituteId } });
  return `RCT-${new Date().getFullYear()}-${numberSuffix(count + 1)}`;
}

export function monthLabel(month: string | null) {
  if (!month) {
    return "No month";
  }

  const [year, monthValue] = month.split("-");
  return new Date(Number(year), Number(monthValue) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
