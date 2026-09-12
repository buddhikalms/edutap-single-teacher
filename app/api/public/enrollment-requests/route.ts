import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createPaymentSlipStorageKey,
  paymentDetailsSchema,
  removePaymentSlip,
  savePaymentSlip,
  validatePaymentSlip,
  type ValidatedPaymentSlip
} from "@/lib/payment-slips";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { strongPasswordSchema } from "@/lib/validations";

const schema = z.object({
  classGroupId: z.string().trim().min(1, "Please select a class."),
  gradeId: z.string().trim().min(1, "Please select the student's grade."),
  parentName: z.string().trim().min(2, "Parent or guardian name is required.").max(120),
  parentMobile: z.string().trim().min(7, "Parent mobile is required.").max(30),
  parentEmail: z.string().trim().email("Enter a valid parent email.").optional().or(z.literal("")),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  studentName: z.string().trim().min(2, "Student name is required.").max(120),
  avatarUrl: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  paymentMade: z.enum(["yes", "no"]),
  agreement: z.literal("true"),
  website: z.string().max(0).optional()
}).superRefine((data, context) => {
  if (data.password !== data.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

function normalizeMobile(value: string) {
  return value.replace(/[^\d+]/g, "");
}

async function generateAdmissionNo(tx: Prisma.TransactionClient, instituteId: string) {
  const prefix = `STU-${new Date().getFullYear().toString().slice(-2)}-`;
  const existing = await tx.student.findMany({
    where: { instituteId, admissionNo: { startsWith: prefix } },
    select: { admissionNo: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const max = existing.reduce((highest, student) => {
    const sequence = Number(student.admissionNo.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  const limit = checkRateLimit({ key: rateLimitKey(request, "public-enrollment-request"), limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Could not read the enrollment form." }, { status: 400 });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  }
  let paymentDetails: z.infer<typeof paymentDetailsSchema> | null = null;
  let paymentFile: ValidatedPaymentSlip | null = null;
  if (parsed.data.paymentMade === "yes") {
    const details = paymentDetailsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!details.success) return NextResponse.json({ message: details.error.issues[0]?.message ?? "Check the payment details." }, { status: 400 });
    paymentDetails = details.data;
    try {
      paymentFile = await validatePaymentSlip(formData.get("paymentSlip"));
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid payment slip." }, { status: 400 });
    }
  }

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: parsed.data.classGroupId, status: "ACTIVE", gradeId: parsed.data.gradeId },
    include: { teacher: { select: { id: true, userId: true, status: true } } }
  });
  if (!classGroup || !classGroup.gradeId) {
    return NextResponse.json({ message: "The selected class does not match the selected grade or is no longer accepting requests." }, { status: 404 });
  }
  if (!classGroup.teacherId || classGroup.teacher?.status !== "ACTIVE") {
    return NextResponse.json({ message: "This teacher portal is currently unavailable." }, { status: 403 });
  }

  const parentMobile = normalizeMobile(parsed.data.parentMobile);
  const parentEmail = (parsed.data.parentEmail || "").toLowerCase() || null;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ mobile: parentMobile }, ...(parentEmail ? [{ email: parentEmail }] : [])] },
    select: { mobile: true, email: true }
  });
  if (existing) {
    const field = existing.mobile === parentMobile ? "mobile number" : "email address";
    return NextResponse.json({ message: `This ${field} already belongs to an EduTap Account. Please sign in instead.` }, { status: 409 });
  }
  const owner = classGroup.teacher?.userId
    ? { id: classGroup.teacher.userId }
    : await prisma.user.findFirst({
        where: { instituteId: classGroup.instituteId, role: { in: ["INSTITUTE_ADMIN", "TEACHER"] } },
        select: { id: true },
        orderBy: { createdAt: "asc" }
      });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const slipId = paymentFile ? randomUUID() : null;
  const storageKey = paymentFile ? createPaymentSlipStorageKey(classGroup.instituteId, paymentFile.extension) : null;

  try {
    if (paymentFile && storageKey) await savePaymentSlip(storageKey, paymentFile.bytes);
    const enrollmentRequest = await prisma.$transaction(async (tx) => {
      const admissionNo = await generateAdmissionNo(tx, classGroup.instituteId);
      const familyUser = await tx.user.create({
        data: {
          name: parsed.data.parentName,
          email: parentEmail,
          mobile: parentMobile,
          passwordHash,
          authProvider: "PASSWORD",
          role: "FAMILY",
          accountStatus: "PENDING_APPROVAL",
          instituteId: classGroup.instituteId,
          branchId: classGroup.branchId
        }
      });
      const parent = await tx.parent.create({
        data: {
          instituteId: classGroup.instituteId,
          userId: familyUser.id,
          name: parsed.data.parentName,
          phone: parentMobile,
          email: parentEmail,
          status: "PENDING_APPROVAL",
          relationship: "Guardian",
          appLoginIdentifier: parentEmail || parentMobile,
          emergencyContactNumber: parentMobile
        }
      });
      const nameParts = parsed.data.studentName.trim().split(/\s+/);
      const student = await tx.student.create({
        data: {
          admissionNo,
          firstName: nameParts.shift() || parsed.data.studentName,
          lastName: nameParts.join(" "),
          avatarUrl: parsed.data.avatarUrl || null,
          status: "PENDING_APPROVAL",
          instituteId: classGroup.instituteId,
          branchId: classGroup.branchId,
          familyUserId: familyUser.id,
          parents: { connect: { id: parent.id } }
        }
      });
      await tx.parentStudent.create({ data: { parentId: parent.id, studentId: student.id, relation: "Guardian" } });
      const created = await tx.enrollmentRequest.create({
        data: {
          instituteId: classGroup.instituteId,
          teacherId: classGroup.teacherId,
          familyUserId: familyUser.id,
          requestedParentId: parent.id,
          requestedStudentId: student.id,
          parentUserId: familyUser.id,
          parentName: parsed.data.parentName,
          parentMobile,
          parentEmail,
          studentName: parsed.data.studentName,
          studentMobile: null,
          gradeId: classGroup.gradeId!,
          subjectId: classGroup.subjectId,
          classGroupId: classGroup.id,
          message: parsed.data.message || null
        }
      });
      if (paymentFile && paymentDetails && slipId && storageKey) {
        await tx.enrollmentPaymentSlip.create({
          data: {
            id: slipId,
            enrollmentRequestId: created.id,
            familyUserId: familyUser.id,
            studentId: student.id,
            fileUrl: `/api/payment-slips/${slipId}/file`,
            storageKey,
            fileName: paymentFile.fileName,
            fileType: paymentFile.fileType,
            fileSize: paymentFile.fileSize,
            paidAmount: paymentDetails.paidAmount,
            paymentMethod: paymentDetails.paymentMethod,
            paymentDate: new Date(`${paymentDetails.paymentDate}T00:00:00`),
            referenceNumber: paymentDetails.referenceNumber || null
          }
        });
      }
      if (owner) {
        await tx.notification.create({
          data: {
            instituteId: classGroup.instituteId,
            userId: owner.id,
            type: "ENROLLMENT_REQUEST",
            title: "New family enrollment request",
            body: `${created.studentName} requested ${classGroup.name}.`,
            message: `${created.parentName} requested enrollment for ${created.studentName} in ${classGroup.name}.`,
            actionUrl: "/dashboard/enrollment-requests",
            dataJson: { enrollmentRequestId: created.id }
          }
        });
      }
      return created;
    });
    return NextResponse.json({ ok: true, id: enrollmentRequest.id }, { status: 201 });
  } catch (error) {
    await removePaymentSlip(storageKey);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "That email or mobile number is already registered. Please sign in instead." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: "Could not create the enrollment request." }, { status: 500 });
  }
}
