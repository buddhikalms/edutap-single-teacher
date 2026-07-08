"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CourseEnrollmentStatus, CourseResourceType, Prisma } from "@prisma/client";
import { nextInvoiceNo } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { requireOwnerTeacherId } from "@/lib/single-teacher";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { COURSE_RESOURCE_POLICY, assertUploadSignature, safeUploadExtension, scanFileForViruses } from "@/lib/file-security";
import { uploadDiskPath } from "@/lib/upload-storage";
import { sendStudentWebPush } from "@/lib/web-push";
import { courseSchema, type CourseInput } from "@/lib/validations";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function date(value?: string) {
  return value ? new Date(value) : null;
}

async function assertCourse(courseId: string, instituteId: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, instituteId } });
  if (!course) throw new Error("Course not found.");
  return course;
}

export async function saveCourse(id: string | null, input: CourseInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = courseSchema.parse(input);
    const subject = await prisma.subject.findFirst({ where: { id: parsed.subjectId, instituteId, isActive: true } });
    if (!subject) return { ok: false, message: "Select a valid subject." };

    const grade = parsed.gradeId ? await prisma.grade.findFirst({ where: { id: parsed.gradeId, instituteId, isActive: true } }) : null;
    if (parsed.gradeId && !grade) return { ok: false, message: "Select a valid grade." };

    const teacherId = await requireOwnerTeacherId(instituteId);
    const base = slugify(parsed.name) || "course";
    const data = {
      name: parsed.name,
      subject: subject.name,
      subjectId: subject.id,
      grade: grade?.name ?? null,
      gradeId: grade?.id ?? null,
      description: parsed.description ?? null,
      thumbnailUrl: parsed.thumbnailUrl ?? null,
      durationType: parsed.durationType,
      durationValue: parsed.durationType === "LIFETIME" ? null : parsed.durationValue ?? 1,
      accessType: parsed.accessType,
      isFree: parsed.accessType === "FREE",
      fee: parsed.accessType === "FREE" ? 0 : parsed.fee,
      startDate: date(parsed.startDate),
      endDate: date(parsed.endDate),
      status: parsed.status,
      teacherId
    };

    if (id) {
      await prisma.course.update({ where: { id }, data });
    } else {
      await prisma.course.create({
        data: {
          ...data,
          instituteId,
          slug: `${base}-${Date.now().toString(36)}`,
          code: `CRS-${Date.now().toString(36).toUpperCase()}`
        }
      });
    }

    revalidatePath("/dashboard/courses");
    if (id) revalidatePath(`/dashboard/courses/${id}`);
    return { ok: true, message: id ? "Course updated." : "Course created." };
  } catch (error) {
    return actionError(error, "Could not save course.");
  }
}

export async function createModule(courseId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);

  await prisma.courseModule.create({
    data: {
      courseId,
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") || 0),
      isFreePreview: formData.get("isFreePreview") === "on",
      isLocked: formData.get("isLocked") === "on"
    }
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=modules`);
}

export async function updateModule(courseId: string, moduleId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);

  await prisma.courseModule.updateMany({
    where: { id: moduleId, courseId },
    data: {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") || 0),
      isFreePreview: formData.get("isFreePreview") === "on",
      isLocked: formData.get("isLocked") === "on"
    }
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=modules`);
}

export async function deleteModule(courseId: string, moduleId: string) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.courseModule.deleteMany({ where: { id: moduleId, courseId } });
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=modules`);
}

async function storeResource(courseId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size) return null;
  const ext = safeUploadExtension(file, COURSE_RESOURCE_POLICY);
  const bytes = Buffer.from(await file.arrayBuffer());
  assertUploadSignature(file, bytes);
  const scan = await scanFileForViruses();
  if (!scan.clean) throw new Error("The resource file could not be accepted.");

  const folder = uploadDiskPath("courses", courseId);
  await mkdir(folder, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(folder, name), bytes, { flag: "wx" });
  return `/courses/${courseId}/${name}`;
}

type ResourceVisibility = "FREE_PREVIEW" | "ENROLLED" | "DRAFT" | "SCHEDULED";

function visibilityToAccessType(visibility: ResourceVisibility) {
  return visibility === "FREE_PREVIEW" ? "FREE" : "PAID";
}

export async function createResource(courseId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  const moduleId = String(formData.get("moduleId") || "");
  if (!moduleId) throw new Error("Select a module before adding a resource.");

  const courseModule = await prisma.courseModule.findFirst({ where: { id: moduleId, courseId }, select: { id: true } });
  if (!courseModule) throw new Error("Selected module was not found.");

  const visibility = String(formData.get("visibility") || "ENROLLED") as ResourceVisibility;
  const fileUrl = await storeResource(courseId, formData.get("resourceFile"));
  const externalUrl = String(formData.get("externalUrl") || "").trim() || null;

  await prisma.courseResource.create({
    data: {
      instituteId,
      courseId,
      moduleId,
      resourceType: String(formData.get("resourceType") || "PDF") as CourseResourceType,
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      fileUrl,
      externalUrl,
      visibility,
      publishAt: visibility === "SCHEDULED" ? date(String(formData.get("publishAt") || "")) : null,
      accessType: visibilityToAccessType(visibility),
      sortOrder: Number(formData.get("sortOrder") || 0)
    }
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=resources`);
}

export async function updateResource(courseId: string, resourceId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  const moduleId = String(formData.get("moduleId") || "");
  const visibility = String(formData.get("visibility") || "ENROLLED") as ResourceVisibility;
  const fileUrl = await storeResource(courseId, formData.get("resourceFile"));
  const externalUrl = String(formData.get("externalUrl") || "").trim() || null;

  if (!moduleId) throw new Error("Select a module.");

  await prisma.courseResource.updateMany({
    where: { id: resourceId, courseId, instituteId },
    data: {
      moduleId,
      resourceType: String(formData.get("resourceType") || "PDF") as CourseResourceType,
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      externalUrl,
      fileUrl: fileUrl ?? undefined,
      visibility,
      publishAt: visibility === "SCHEDULED" ? date(String(formData.get("publishAt") || "")) : null,
      accessType: visibilityToAccessType(visibility),
      sortOrder: Number(formData.get("sortOrder") || 0)
    }
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=resources`);
}

export async function deleteResource(courseId: string, resourceId: string) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.courseResource.deleteMany({ where: { id: resourceId, courseId, instituteId } });
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=resources`);
}

export async function updateCourseSettings(courseId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  const subjectId = String(formData.get("subjectId") || "");
  const gradeId = String(formData.get("gradeId") || "") || null;
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, instituteId, isActive: true } });
  const grade = gradeId ? await prisma.grade.findFirst({ where: { id: gradeId, instituteId, isActive: true } }) : null;
  if (!subject) throw new Error("Select a valid subject.");
  if (gradeId && !grade) throw new Error("Select a valid grade.");

  await prisma.course.update({
    where: { id: courseId },
    data: {
      name: String(formData.get("name") || "").trim(),
      subject: subject.name,
      subjectId: subject.id,
      grade: grade?.name ?? null,
      gradeId: grade?.id ?? null,
      description: String(formData.get("description") || "").trim() || null,
      thumbnailUrl: String(formData.get("thumbnailUrl") || "").trim() || null,
      durationType: String(formData.get("durationType") || "MONTHS") as never,
      durationValue: String(formData.get("durationType")) === "LIFETIME" ? null : Number(formData.get("durationValue") || 1),
      accessType: String(formData.get("accessType") || "PAID") as never,
      isFree: String(formData.get("accessType") || "PAID") === "FREE",
      fee: String(formData.get("accessType") || "PAID") === "FREE" ? 0 : Number(formData.get("fee") || 0),
      startDate: date(String(formData.get("startDate") || "")),
      endDate: date(String(formData.get("endDate") || "")),
      status: String(formData.get("status") || "DRAFT") as never
    }
  });

  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=settings`);
}

async function enrollStudent(tx: Prisma.TransactionClient, input: { instituteId: string; courseId: string; studentId: string; paidAmount?: number; userName?: string }) {
  const course = await tx.course.findFirst({ where: { id: input.courseId, instituteId: input.instituteId } });
  if (!course) throw new Error("Course not found.");

  await tx.courseEnrollment.upsert({
    where: { courseId_studentId: { courseId: input.courseId, studentId: input.studentId } },
    create: {
      instituteId: input.instituteId,
      courseId: input.courseId,
      studentId: input.studentId,
      status: "ACTIVE",
      unlockedAt: new Date(),
      paidAmount: input.paidAmount ?? 0
    },
    update: {
      status: "ACTIVE",
      unlockedAt: new Date(),
      lockedAt: null,
      paidAmount: input.paidAmount ?? undefined
    }
  });

  if ((input.paidAmount ?? 0) > 0) {
    await tx.payment.create({
      data: {
        invoiceNo: await nextInvoiceNo(input.instituteId),
        type: "COURSE_PAYMENT",
        amount: course.fee,
        paidAmount: input.paidAmount ?? 0,
        balance: Math.max(0, Number(course.fee) - (input.paidAmount ?? 0)),
        dueDate: new Date(),
        paidAt: (input.paidAmount ?? 0) >= Number(course.fee) ? new Date() : null,
        status: (input.paidAmount ?? 0) >= Number(course.fee) ? "PAID" : "PARTIAL",
        method: "CASH",
        receivedBy: input.userName,
        instituteId: input.instituteId,
        studentId: input.studentId,
        courseId: input.courseId
      }
    });
  }
}

export async function unlockCourse(courseId: string, formData: FormData) {
  const { instituteId, userName } = await getTenantContext();
  const studentId = String(formData.get("studentId"));
  const paidAmount = Number(formData.get("paidAmount") || 0);
  await prisma.$transaction(async (tx) => enrollStudent(tx, { instituteId, courseId, studentId, paidAmount, userName }));
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=enrollments`);
}

export async function enrollSelectedStudents(courseId: string, formData: FormData) {
  const { instituteId, userName } = await getTenantContext();
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  if (!studentIds.length) throw new Error("Select at least one student.");

  const count = await prisma.student.count({ where: { instituteId, id: { in: studentIds }, status: "ACTIVE" } });
  if (count !== studentIds.length) throw new Error("Selected students must be active students.");

  await prisma.$transaction(async (tx) => {
    for (const studentId of studentIds) await enrollStudent(tx, { instituteId, courseId, studentId, userName });
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=enrollments`);
}

export async function importClassStudents(courseId: string, formData: FormData) {
  const { instituteId, userName } = await getTenantContext();
  const classGroupId = String(formData.get("classGroupId") || "");
  const enrollments = await prisma.enrollment.findMany({
    where: { classGroupId, active: true, student: { instituteId, status: "ACTIVE" } },
    select: { studentId: true }
  });

  await prisma.$transaction(async (tx) => {
    for (const enrollment of enrollments) {
      await enrollStudent(tx, { instituteId, courseId, studentId: enrollment.studentId, userName });
    }
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=enrollments`);
}

export async function setCourseEnrollmentStatus(courseId: string, enrollmentId: string, status: CourseEnrollmentStatus) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status,
      lockedAt: status === "PENDING" || status === "CANCELLED" ? new Date() : null,
      unlockedAt: status === "ACTIVE" ? new Date() : undefined
    }
  });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function removeCourseEnrollment(courseId: string, enrollmentId: string) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.courseEnrollment.delete({ where: { id: enrollmentId } });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function resetCourseProgress(courseId: string, enrollmentId: string) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.courseEnrollment.update({ where: { id: enrollmentId }, data: { progress: 0, status: "ACTIVE" } });
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function sendCourseNotification(courseId: string, enrollmentId: string) {
  const { instituteId } = await getTenantContext();
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { id: enrollmentId, courseId, instituteId },
    include: { student: true, course: true }
  });
  if (!enrollment) throw new Error("Enrollment not found.");

  const notification = await prisma.notification.create({
    data: {
      instituteId,
      studentId: enrollment.studentId,
      title: `Course update: ${enrollment.course.name}`,
      message: `Your teacher has sent an update for ${enrollment.course.name}.`,
      type: "COURSE_RESOURCE_UPLOADED",
      actionUrl: `/student/courses/${courseId}`,
      dataJson: { courseId, actionUrl: `/student/courses/${courseId}` }
    }
  });

  await sendStudentWebPush({
    instituteId,
    studentId: enrollment.studentId,
    notificationId: notification.id,
    type: "COURSE_RESOURCE_UPLOADED",
    title: `Course update: ${enrollment.course.name}`,
    body: `Your teacher has sent an update for ${enrollment.course.name}.`,
    data: { courseId, actionUrl: `/student/courses/${courseId}` }
  }).catch((error) => console.error("Student course web push failed", error));

  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function assignQuizToCourse(courseId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  const quizId = String(formData.get("quizId"));
  const moduleId = String(formData.get("moduleId") || "") || null;
  const [quiz, courseModule] = await Promise.all([
    prisma.quiz.findFirst({ where: { id: quizId, instituteId }, select: { id: true } }),
    moduleId ? prisma.courseModule.findFirst({ where: { id: moduleId, courseId }, select: { id: true } }) : null
  ]);
  if (!quiz || (moduleId && !courseModule)) throw new Error("Quiz or module not found.");
  await prisma.quiz.update({ where: { id: quizId }, data: { courseId, courseModuleId: moduleId } });
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=quizzes`);
}

export async function detachQuizFromCourse(courseId: string, quizId: string) {
  const { instituteId } = await getTenantContext();
  await assertCourse(courseId, instituteId);
  await prisma.quiz.updateMany({ where: { id: quizId, instituteId, courseId }, data: { courseId: null, courseModuleId: null } });
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/dashboard/courses/${courseId}?tab=quizzes`);
}
