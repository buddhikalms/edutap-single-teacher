"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNo, nextReceiptNo } from "@/lib/payments";
import { paymentMethodForLedger } from "@/lib/payment-slips";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";

export type EnrollmentRequestActionState = ActionState;

function noteFrom(formData: FormData) {
  const value = String(formData.get("teacherNote") || "").trim();
  return value || null;
}

function revalidate() {
  revalidatePath("/dashboard/enrollment-requests");
  revalidatePath("/students");
  revalidatePath("/enrollment");
  revalidatePath("/payments");
  revalidatePath("/family/payments");
  revalidatePath("/family/pending");
}

async function queueContact(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], data: {
  instituteId: string;
  type: "ENROLLMENT_APPROVED" | "ENROLLMENT_REJECTED";
  title: string;
  message: string;
  mobile: string;
  email?: string | null;
  studentId?: string;
}) {
  await tx.notificationLog.create({
    data: {
      instituteId: data.instituteId,
      studentId: data.studentId,
      type: data.type,
      channel: "SMS",
      status: "QUEUED",
      title: data.title,
      message: data.message,
      target: data.mobile,
      recipientType: "PARENT"
    }
  });
  if (data.email) {
    await tx.notificationLog.create({
      data: {
        instituteId: data.instituteId,
        studentId: data.studentId,
        type: data.type,
        channel: "EMAIL",
        status: "QUEUED",
        title: data.title,
        message: data.message,
        target: data.email,
        recipientType: "PARENT"
      }
    });
  }
}

async function processEnrollmentApproval(id: string, formData: FormData, verifyPayment: boolean): Promise<EnrollmentRequestActionState> {
  try {
    const { instituteId, userName } = await getTenantContext();
    const request = await prisma.enrollmentRequest.findFirst({
      where: { id, instituteId, status: "PENDING" },
      include: { classGroup: true, paymentSlip: true }
    });
    if (!request) return { ok: false, message: "This pending request was not found." };
    const familyUserId = request.familyUserId ?? request.parentUserId;
    if (!request.requestedStudentId || !request.requestedParentId || !familyUserId) {
      return { ok: false, message: "This legacy request has no pending EduTap Account. Ask the user to submit the updated enrollment form." };
    }

    const admissionNo = String(formData.get("admissionNo") || "").trim().toUpperCase();
    const paymentStartRaw = String(formData.get("paymentStartDate") || "");
    const freePeriodType = String(formData.get("freePeriodType") || request.classGroup.defaultFreePeriodType);
    const freeDays = Number(formData.get("freeDays") || 0);
    const allowedFreePeriods = ["NONE", "FIRST_WEEK", "SECOND_WEEK", "FIRST_MONTH", "CUSTOM_DAYS"] as const;
    if (admissionNo.length < 2) return { ok: false, message: "Assign a student ID before approving." };
    if (!allowedFreePeriods.includes(freePeriodType as (typeof allowedFreePeriods)[number])) {
      return { ok: false, message: "Select a valid free period." };
    }
    if (!Number.isInteger(freeDays) || freeDays < 0 || freeDays > 365) {
      return { ok: false, message: "Free days must be between 0 and 365." };
    }
    const paymentStartDate = paymentStartRaw ? new Date(`${paymentStartRaw}T00:00:00`) : request.classGroup.paymentStartDate ?? new Date();
    if (Number.isNaN(paymentStartDate.getTime())) return { ok: false, message: "Enter a valid payment start date." };

    const duplicateStudentId = await prisma.student.findFirst({
      where: { instituteId, admissionNo, id: { not: request.requestedStudentId } },
      select: { id: true }
    });
    if (duplicateStudentId) return { ok: false, message: `Student ID ${admissionNo} is already in use.` };
    if (verifyPayment && request.paymentSlip?.status !== "PENDING_REVIEW") {
      return { ok: false, message: "A pending payment slip is required for enrollment and payment approval." };
    }
    const invoiceNo = verifyPayment ? await nextInvoiceNo(instituteId) : null;
    const receiptNo = verifyPayment ? await nextReceiptNo(instituteId) : null;

    const receipt = await prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: request.requestedStudentId! }, data: { admissionNo, status: "ACTIVE" } });
      await tx.parent.update({ where: { id: request.requestedParentId! }, data: { status: "ACTIVE" } });
      await tx.user.update({ where: { id: familyUserId }, data: { accountStatus: "ACTIVE", role: "FAMILY" } });
      await tx.enrollment.create({
        data: {
          studentId: request.requestedStudentId!,
          classGroupId: request.classGroupId,
          paymentStartDate,
          freePeriodType: freePeriodType as (typeof allowedFreePeriods)[number],
          freeDays,
          monthlyFeeOverride: request.classGroup.monthlyFee
        }
      });
      await tx.enrollmentRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          rejectedAt: null,
          teacherNote: noteFrom(formData),
          convertedStudentId: request.requestedStudentId
        }
      });
      let createdReceipt = null;
      if (verifyPayment && request.paymentSlip && invoiceNo && receiptNo) {
        const payment = await tx.payment.create({
          data: {
            invoiceNo,
            type: "OTHER",
            amount: request.paymentSlip.paidAmount,
            paidAmount: request.paymentSlip.paidAmount,
            balance: 0,
            dueDate: request.paymentSlip.paymentDate,
            paidAt: request.paymentSlip.paymentDate,
            status: "PAID",
            method: paymentMethodForLedger(request.paymentSlip.paymentMethod),
            note: `Verified enrollment payment slip${request.paymentSlip.referenceNumber ? ` · Ref ${request.paymentSlip.referenceNumber}` : ""}`,
            receivedBy: userName,
            instituteId,
            studentId: request.requestedStudentId!,
            classGroupId: request.classGroupId,
            enrollmentRequestId: request.id
          }
        });
        createdReceipt = await tx.receipt.create({
          data: {
            receiptNo,
            amount: request.paymentSlip.paidAmount,
            paymentId: payment.id,
            instituteId,
            receivedBy: userName
          }
        });
        await tx.enrollmentPaymentSlip.update({
          where: { id: request.paymentSlip.id },
          data: {
            paymentId: payment.id,
            studentId: request.requestedStudentId,
            status: "VERIFIED",
            teacherNote: noteFrom(formData),
            reviewedAt: new Date()
          }
        });
      }
      await queueContact(tx, {
        instituteId,
        type: "ENROLLMENT_APPROVED",
        title: "Class request approved",
        message: `${request.studentName}'s request for ${request.classGroup.name} was approved. Student ID: ${admissionNo}. The EduTap Account can now sign in.`,
        mobile: request.parentMobile,
        email: request.parentEmail,
        studentId: request.requestedStudentId!
      });
      return createdReceipt;
    });
    revalidate();
    return {
      ok: true,
      message: receipt
        ? `Enrollment approved, payment verified, and receipt ${receipt.receiptNo} generated.`
        : "Request approved. Both accounts are active and the student is enrolled."
    };
  } catch (error) {
    return actionError(error, "Could not approve the request.");
  }
}

export async function approveEnrollmentRequest(id: string, formData: FormData): Promise<EnrollmentRequestActionState> {
  return processEnrollmentApproval(id, formData, false);
}

export async function approveEnrollmentAndVerifyPayment(id: string, formData: FormData): Promise<EnrollmentRequestActionState> {
  return processEnrollmentApproval(id, formData, true);
}

export async function verifyEnrollmentPayment(id: string, formData: FormData): Promise<EnrollmentRequestActionState> {
  try {
    const { instituteId, userName } = await getTenantContext();
    const request = await prisma.enrollmentRequest.findFirst({
      where: { id, instituteId, status: "APPROVED" },
      include: { paymentSlip: true }
    });
    if (!request?.paymentSlip || request.paymentSlip.status !== "PENDING_REVIEW" || !request.requestedStudentId) {
      return { ok: false, message: "A pending slip on an approved enrollment was not found." };
    }
    const [invoiceNo, receiptNo] = await Promise.all([nextInvoiceNo(instituteId), nextReceiptNo(instituteId)]);
    const receipt = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceNo,
          type: "OTHER",
          amount: request.paymentSlip!.paidAmount,
          paidAmount: request.paymentSlip!.paidAmount,
          balance: 0,
          dueDate: request.paymentSlip!.paymentDate,
          paidAt: request.paymentSlip!.paymentDate,
          status: "PAID",
          method: paymentMethodForLedger(request.paymentSlip!.paymentMethod),
          note: `Verified enrollment payment slip${request.paymentSlip!.referenceNumber ? ` · Ref ${request.paymentSlip!.referenceNumber}` : ""}`,
          receivedBy: userName,
          instituteId,
          studentId: request.requestedStudentId!,
          classGroupId: request.classGroupId,
          enrollmentRequestId: request.id
        }
      });
      const created = await tx.receipt.create({
        data: { receiptNo, amount: request.paymentSlip!.paidAmount, paymentId: payment.id, instituteId, receivedBy: userName }
      });
      await tx.enrollmentPaymentSlip.update({
        where: { id: request.paymentSlip!.id },
        data: { paymentId: payment.id, studentId: request.requestedStudentId, status: "VERIFIED", teacherNote: noteFrom(formData), reviewedAt: new Date() }
      });
      return created;
    });
    revalidate();
    return { ok: true, message: `Payment verified and receipt ${receipt.receiptNo} generated.` };
  } catch (error) {
    return actionError(error, "Could not verify the payment slip.");
  }
}

export async function rejectEnrollmentPayment(id: string, formData: FormData): Promise<EnrollmentRequestActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const request = await prisma.enrollmentRequest.findFirst({
      where: { id, instituteId, status: { in: ["PENDING", "APPROVED"] } },
      include: { paymentSlip: true }
    });
    if (!request?.paymentSlip || request.paymentSlip.status !== "PENDING_REVIEW") {
      return { ok: false, message: "A pending payment slip was not found." };
    }
    const teacherNote = noteFrom(formData);
    if (!teacherNote) return { ok: false, message: "Add a note explaining what should be corrected." };
    await prisma.enrollmentPaymentSlip.update({
      where: { id: request.paymentSlip.id },
      data: { status: "REJECTED", teacherNote, reviewedAt: new Date() }
    });
    revalidate();
    return { ok: true, message: "Payment slip rejected. The family can now upload a replacement." };
  } catch (error) {
    return actionError(error, "Could not reject the payment slip.");
  }
}

export async function rejectEnrollmentRequest(id: string, formData: FormData): Promise<EnrollmentRequestActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const request = await prisma.enrollmentRequest.findFirst({ where: { id, instituteId, status: { in: ["PENDING", "APPROVED"] } }, include: { classGroup: true } });
    if (!request) return { ok: false, message: "This request can no longer be rejected." };
    const teacherNote = noteFrom(formData);

    await prisma.$transaction(async (tx) => {
      await tx.enrollmentRequest.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date(), teacherNote } });
      const userIds = [request.familyUserId, request.parentUserId, request.studentUserId].filter((value): value is string => Boolean(value));
      if (userIds.length) {
        await tx.user.updateMany({ where: { id: { in: userIds } }, data: { accountStatus: "REJECTED" } });
      }
      if (request.requestedParentId) await tx.parent.update({ where: { id: request.requestedParentId }, data: { status: "REJECTED" } });
      if (request.requestedStudentId) await tx.student.update({ where: { id: request.requestedStudentId }, data: { status: "REJECTED" } });
      await queueContact(tx, {
        instituteId,
        type: "ENROLLMENT_REJECTED",
        title: "Class enrollment update",
        message: teacherNote || `${request.studentName}'s request for ${request.classGroup.name} was not approved at this time.`,
        mobile: request.parentMobile,
        email: request.parentEmail
      });
    });
    revalidate();
    return { ok: true, message: "Request rejected and the family notification was queued." };
  } catch (error) {
    return actionError(error, "Could not reject the request.");
  }
}
