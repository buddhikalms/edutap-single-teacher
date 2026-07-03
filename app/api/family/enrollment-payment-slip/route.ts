import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  createPaymentSlipStorageKey,
  paymentDetailsSchema,
  removePaymentSlip,
  savePaymentSlip,
  validatePaymentSlip
} from "@/lib/payment-slips";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "FAMILY") {
    return NextResponse.json({ message: "Sign in with the family account to upload a payment slip." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Could not read the upload." }, { status: 400 });
  const enrollmentRequestId = String(formData.get("enrollmentRequestId") || "");
  const details = paymentDetailsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!details.success) return NextResponse.json({ message: details.error.issues[0]?.message ?? "Check the payment details." }, { status: 400 });

  let file;
  try {
    file = await validatePaymentSlip(formData.get("paymentSlip"));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid payment slip." }, { status: 400 });
  }

  const enrollment = await prisma.enrollmentRequest.findFirst({
    where: {
      id: enrollmentRequestId,
      familyUserId: session.user.id,
      status: { in: ["PENDING", "APPROVED"] }
    },
    include: {
      paymentSlip: true,
      classGroup: { include: { teacher: { select: { userId: true } } } }
    }
  });
  if (!enrollment?.paymentSlip || enrollment.paymentSlip.status !== "REJECTED") {
    return NextResponse.json({ message: "A rejected payment slip eligible for resubmission was not found." }, { status: 404 });
  }

  const existingSlip = enrollment.paymentSlip;
  const storageKey = createPaymentSlipStorageKey(enrollment.instituteId, file.extension);
  try {
    await savePaymentSlip(storageKey, file.bytes);
    await prisma.$transaction(async (tx) => {
      await tx.enrollmentPaymentSlip.update({
        where: { id: existingSlip.id },
        data: {
          storageKey,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          paidAmount: details.data.paidAmount,
          paymentMethod: details.data.paymentMethod,
          paymentDate: new Date(`${details.data.paymentDate}T00:00:00`),
          referenceNumber: details.data.referenceNumber || null,
          status: "PENDING_REVIEW",
          teacherNote: null,
          reviewedAt: null
        }
      });
      const teacherUserId = enrollment.classGroup.teacher?.userId;
      if (teacherUserId) {
        await tx.notification.create({
          data: {
            instituteId: enrollment.instituteId,
            userId: teacherUserId,
            type: "ENROLLMENT_REQUEST",
            title: "Payment slip resubmitted",
            body: `${enrollment.studentName} uploaded a new payment slip.`,
            message: `A replacement payment slip is ready for review for ${enrollment.classGroup.name}.`,
            actionUrl: "/dashboard/enrollment-requests",
            dataJson: { enrollmentRequestId: enrollment.id, paymentSlipId: existingSlip.id }
          }
        });
      }
    });
    await removePaymentSlip(existingSlip.storageKey);
    return NextResponse.json({ ok: true, message: "Your new payment slip was sent for review." });
  } catch (error) {
    await removePaymentSlip(storageKey);
    console.error(error);
    return NextResponse.json({ message: "Could not resubmit the payment slip." }, { status: 500 });
  }
}
