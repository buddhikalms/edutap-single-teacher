import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

type ReceiptPdfParams = {
  params: Promise<{ receiptId: string }>;
};

function clean(value: string | null | undefined) {
  return value?.trim() || "-";
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function canAccessReceipt(user: Session["user"], studentId: string) {
  if (!["PARENT", "STUDENT", "FAMILY"].includes(user.role)) {
    return true;
  }

  if (user.role === "STUDENT") {
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: user.instituteId ?? undefined, userId: user.id },
      select: { id: true }
    });
    return Boolean(student);
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, instituteId: user.instituteId ?? undefined },
    include: {
      students: { select: { id: true } },
      studentLinks: { select: { studentId: true } }
    }
  });
  const linkedIds = new Set([...(parent?.students.map((student) => student.id) ?? []), ...(parent?.studentLinks.map((link) => link.studentId) ?? [])]);
  return linkedIds.has(studentId);
}

export async function GET(_request: Request, { params }: ReceiptPdfParams) {
  const session = await getServerSession(authOptions);
  const { receiptId } = await params;

  if (!session?.user?.id || !session.user.instituteId) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, instituteId: session.user.instituteId },
    include: {
      institute: { include: { settings: true } },
      payment: {
        include: {
          student: { include: { branch: true } },
          classGroup: { include: { subject: true } },
          course: true
        }
      }
    }
  });

  if (!receipt) {
    return NextResponse.json({ message: "Receipt was not found." }, { status: 404 });
  }

  if (!(await canAccessReceipt(session.user, receipt.payment.studentId))) {
    return NextResponse.json({ message: "You cannot access this receipt." }, { status: 403 });
  }

  const currency = receipt.institute.settings?.currency ?? "USD";
  const payment = receipt.payment;
  const student = payment.student;
  const studentName = fullName(student.firstName, student.lastName);
  const className = payment.classGroup ? `${payment.classGroup.name} - ${payment.classGroup.subject.name}` : payment.course?.name ?? "General payment";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const margin = 48;
  const ink = rgb(0.08, 0.1, 0.15);
  const muted = rgb(0.39, 0.43, 0.5);
  const line = rgb(0.86, 0.88, 0.91);
  const teal = rgb(0.03, 0.45, 0.42);
  const paleTeal = rgb(0.9, 0.98, 0.96);
  const soft = rgb(0.97, 0.98, 0.99);
  let y = height - margin;

  function drawText(value: string, x: number, yPos: number, size = 10, useBold = false, color = ink) {
    page.drawText(value.slice(0, 95), { x, y: yPos, size, font: useBold ? bold : font, color });
  }

  function labelValue(label: string, value: string, x: number, yPos: number, boxWidth: number) {
    drawText(label.toUpperCase(), x, yPos + 20, 7.5, true, muted);
    drawText(value, x, yPos, 10.5, true, ink);
    page.drawLine({ start: { x, y: yPos - 8 }, end: { x: x + boxWidth, y: yPos - 8 }, thickness: 0.7, color: line });
  }

  function detailRow(label: string, value: string, index: number) {
    const rowHeight = 31;
    y -= rowHeight;
    if (index % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - 8, width: width - margin * 2, height: rowHeight, color: soft });
    }
    drawText(label, margin + 16, y + 2, 9.5, false, muted);
    drawText(value, margin + 235, y + 2, 9.5, true, ink);
  }

  page.drawRectangle({ x: 0, y: height - 132, width, height: 132, color: paleTeal });
  page.drawRectangle({ x: 0, y: height - 132, width, height: 6, color: teal });
  page.drawCircle({ x: margin + 18, y: height - 62, size: 18, color: teal });
  drawText(clean(receipt.institute.name).slice(0, 1).toUpperCase(), margin + 9.5, height - 69, 18, true, rgb(1, 1, 1));
  drawText(clean(receipt.institute.name), margin + 48, height - 54, 19, true, ink);
  drawText(clean(receipt.institute.address), margin + 48, height - 74, 9.5, false, muted);
  drawText(clean(receipt.institute.phone ?? receipt.institute.email), margin + 48, height - 90, 9.5, false, muted);

  drawText("INVOICE", width - margin - 122, height - 54, 21, true, teal);
  page.drawRectangle({ x: width - margin - 122, y: height - 88, width: 122, height: 24, color: rgb(0.82, 0.96, 0.91) });
  drawText("PAID", width - margin - 79, height - 80, 10, true, teal);
  drawText(receipt.receiptNo, width - margin - 122, height - 107, 10.5, true, ink);

  y = height - 172;
  const summaryHeight = 92;
  page.drawRectangle({ x: margin, y: y - summaryHeight + 12, width: width - margin * 2, height: summaryHeight, color: rgb(1, 1, 1), borderColor: line, borderWidth: 1 });
  drawText("Amount received", margin + 24, y - 18, 9.5, false, muted);
  drawText(formatCurrency(receipt.amount.toString(), currency), margin + 24, y - 52, 27, true, teal);
  drawText("Receipt issued", margin + 315, y - 18, 9.5, false, muted);
  drawText(receipt.issuedAt.toLocaleDateString(), margin + 315, y - 40, 13, true, ink);
  drawText(receipt.issuedAt.toLocaleTimeString(), margin + 315, y - 58, 9.5, false, muted);

  y -= 126;
  labelValue("Student", studentName, margin, y, 210);
  labelValue("Admission no", student.admissionNo, margin + 250, y, 110);
  labelValue("Branch", student.branch.name, margin + 400, y, 98);

  y -= 52;
  labelValue("Invoice number", payment.invoiceNo, margin, y, 210);
  labelValue("Class / course", className, margin + 250, y, 248);

  y -= 46;
  page.drawRectangle({ x: margin, y: y - 18, width: width - margin * 2, height: 32, color: teal });
  drawText("PAYMENT DETAILS", margin + 16, y - 6, 10, true, rgb(1, 1, 1));

  const rows = [
    ["Payment type", titleCase(payment.type)],
    ["Month", payment.month ?? "-"],
    ["Original amount", formatCurrency(payment.amount.toString(), currency)],
    ["Discount", formatCurrency(payment.discount.toString(), currency)],
    ["Paid on this receipt", formatCurrency(receipt.amount.toString(), currency)],
    ["Total paid", formatCurrency(payment.paidAmount.toString(), currency)],
    ["Balance", formatCurrency(payment.balance.toString(), currency)],
    ["Method", payment.method ? titleCase(payment.method) : "Not recorded"],
    ["Received by", receipt.receivedBy ?? payment.receivedBy ?? "EduTap"]
  ];

  rows.forEach(([label, value], index) => detailRow(label, value, index));

  y -= 56;
  page.drawRectangle({ x: margin, y: y - 54, width: 250, height: 66, color: soft, borderColor: line, borderWidth: 1 });
  drawText("Notes", margin + 16, y - 10, 9.5, true, muted);
  drawText(payment.note ?? "Thank you for your payment.", margin + 16, y - 32, 9.5, false, ink);

  page.drawRectangle({ x: width - margin - 190, y: y - 54, width: 190, height: 66, color: rgb(1, 1, 1), borderColor: line, borderWidth: 1 });
  page.drawLine({ start: { x: width - margin - 160, y: y - 23 }, end: { x: width - margin - 30, y: y - 23 }, thickness: 1, color: muted });
  drawText("Authorized signature", width - margin - 143, y - 43, 9.5, false, muted);

  page.drawLine({ start: { x: margin, y: 58 }, end: { x: width - margin, y: 58 }, thickness: 0.8, color: line });
  drawText("Generated by EduTap. Valid without a physical stamp unless required by the institute.", margin, 36, 8, false, muted);
  drawText(`Receipt ${receipt.receiptNo}`, width - margin - 90, 36, 8, false, muted);

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${receipt.receiptNo}.pdf"`
    }
  });
}
