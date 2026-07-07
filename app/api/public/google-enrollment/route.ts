import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
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

const schema = z.object({
  parentMobile: z.string().trim().min(7).max(30),
  studentName: z.string().trim().min(2).max(120),
  studentMobile: z.string().trim().max(30).optional().or(z.literal("")),
  gradeId: z.string().min(1),
  classGroupId: z.string().min(1),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  paymentMade: z.enum(["yes", "no"])
});

const normalizeMobile = (value: string) => value.replace(/[^\d+]/g, "");

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "FAMILY") {
    return NextResponse.json({ message: "Continue with Google before completing enrollment." }, { status: 401 });
  }
  const limit = checkRateLimit({ key: rateLimitKey(request, "google-enrollment", session.user.id), limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Could not read the enrollment form." }, { status: 400 });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
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

  const [user, priorRequest, classGroup] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.enrollmentRequest.findFirst({ where: { familyUserId: session.user.id }, select: { id: true } }),
    prisma.classGroup.findFirst({
      where: { id: parsed.data.classGroupId, gradeId: parsed.data.gradeId, status: "ACTIVE" },
      include: { teacher: { select: { userId: true } } }
    })
  ]);
  if (!user?.googleId || !user.email) return NextResponse.json({ message: "A verified Google account is required." }, { status: 403 });
  if (priorRequest) return NextResponse.json({ message: "Your enrollment request has already been submitted." }, { status: 409 });
  if (!classGroup?.gradeId) return NextResponse.json({ message: "That class is no longer accepting requests." }, { status: 404 });

  const parentMobile = normalizeMobile(parsed.data.parentMobile);
  const studentMobile = parsed.data.studentMobile ? normalizeMobile(parsed.data.studentMobile) : null;
  const duplicate = await prisma.user.findFirst({ where: { mobile: parentMobile, id: { not: user.id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ message: "This mobile number already belongs to another EduTap Account." }, { status: 409 });
  if (studentMobile && studentMobile === parentMobile) return NextResponse.json({ message: "Student mobile should be different from the EduTap Account mobile." }, { status: 409 });
  if (studentMobile && await prisma.student.findFirst({ where: { instituteId: classGroup.instituteId, phone: studentMobile }, select: { id: true } })) {
    return NextResponse.json({ message: "This student mobile number is already registered." }, { status: 409 });
  }

  const slipId = paymentFile ? randomUUID() : null;
  const storageKey = paymentFile ? createPaymentSlipStorageKey(classGroup.instituteId, paymentFile.extension) : null;
  try {
    if (paymentFile && storageKey) await savePaymentSlip(storageKey, paymentFile.bytes);
    const created = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          mobile: parentMobile,
          instituteId: classGroup.instituteId,
          branchId: classGroup.branchId,
          role: "FAMILY",
          accountStatus: "PENDING_APPROVAL",
          authProvider: user.passwordHash ? "BOTH" : "GOOGLE"
        }
      });
      const parent = await tx.parent.create({
        data: {
          userId: user.id,
          instituteId: classGroup.instituteId,
          name: user.name,
          phone: parentMobile,
          email: user.email,
          status: "PENDING_APPROVAL",
          relationship: "Guardian",
          appLoginIdentifier: user.email,
          emergencyContactNumber: parentMobile
        }
      });
      const suffix = randomUUID().replaceAll("-", "");
      const parts = parsed.data.studentName.split(/\s+/);
      const student = await tx.student.create({
        data: {
          admissionNo: `PENDING-${suffix.slice(0, 12).toUpperCase()}`,
          firstName: parts.shift() || parsed.data.studentName,
          lastName: parts.join(" ") || "-",
          phone: studentMobile,
          status: "PENDING_APPROVAL",
          familyUserId: user.id,
          instituteId: classGroup.instituteId,
          branchId: classGroup.branchId,
          parents: { connect: { id: parent.id } }
        }
      });
      await tx.parentStudent.create({ data: { parentId: parent.id, studentId: student.id, relation: "Guardian" } });
      const enrollment = await tx.enrollmentRequest.create({
        data: {
          instituteId: classGroup.instituteId,
          familyUserId: user.id,
          parentUserId: user.id,
          requestedParentId: parent.id,
          requestedStudentId: student.id,
          parentName: user.name,
          parentMobile,
          parentEmail: user.email,
          studentName: parsed.data.studentName,
          studentMobile,
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
            enrollmentRequestId: enrollment.id,
            familyUserId: user.id,
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
      if (classGroup.teacher?.userId) {
        await tx.notification.create({
          data: {
            instituteId: classGroup.instituteId,
            userId: classGroup.teacher.userId,
            type: "ENROLLMENT_REQUEST",
            title: "New Google family enrollment",
            body: `${parsed.data.studentName} requested ${classGroup.name}.`,
            message: `${user.name} requested enrollment for ${parsed.data.studentName}.`,
            actionUrl: "/dashboard/enrollment-requests",
            dataJson: { enrollmentRequestId: enrollment.id }
          }
        });
      }
      return enrollment;
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    await removePaymentSlip(storageKey);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "These details are already linked to an account." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: "Could not complete Google enrollment." }, { status: 500 });
  }
}
