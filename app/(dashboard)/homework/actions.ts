"use server";

import { HomeworkStatus } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanManageClass, homeworkSubmissionStatus, parseDateTime, splitLines } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { homeworkSchema, homeworkSubmissionReviewSchema } from "@/lib/validations";

const MAX_HOMEWORK_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const HOMEWORK_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "homework");
const ALLOWED_HOMEWORK_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

async function assignmentStudentIds(classGroupId: string, selectedIds: string[]) {
  if (selectedIds.length > 0) {
    return selectedIds;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { classGroupId, active: true },
    select: { studentId: true }
  });

  return enrollments.map((item) => item.studentId);
}

async function syncHomeworkSubmissions(homeworkId: string, instituteId: string, classGroupId: string, deadline: Date, selectedIds: string[]) {
  const studentIds = await assignmentStudentIds(classGroupId, selectedIds);

  for (const studentId of studentIds) {
    await prisma.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId, studentId } },
      create: {
        homeworkId,
        studentId,
        instituteId,
        status: homeworkSubmissionStatus(deadline, null)
      },
      update: {}
    });
  }
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && "arrayBuffer" in value && "size" in value && value.size > 0;
}

function safeExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (extension && /^[a-z0-9.]+$/.test(extension)) return extension.slice(0, 20);

  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";

  return ".bin";
}

async function saveHomeworkAttachmentFiles(homeworkId: string, files: FormDataEntryValue[]) {
  const uploads = files.filter(isUploadedFile);
  if (!uploads.length) return [];

  const uploadDir = path.join(HOMEWORK_UPLOAD_ROOT, homeworkId);
  await mkdir(uploadDir, { recursive: true });

  const attachments = [];

  for (const file of uploads) {
    if (file.size > MAX_HOMEWORK_ATTACHMENT_BYTES) {
      throw new Error("Homework attachments must be 15 MB or smaller.");
    }

    if (file.type && !ALLOWED_HOMEWORK_TYPES.has(file.type)) {
      throw new Error("Homework attachments must be images, PDFs, Office documents, or text files.");
    }

    const filename = `${randomUUID()}${safeExtension(file)}`;
    const diskPath = path.join(uploadDir, filename);
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

    attachments.push({
      name: file.name || filename,
      url: `/uploads/homework/${homeworkId}/${filename}`,
      type: file.type || null
    });
  }

  return attachments;
}

function linkAttachments(value: string | null | undefined) {
  return splitLines(value).map((url, index) => ({
    name: `Link or note ${index + 1}`,
    url
  }));
}

export async function createHomeworkAction(formData: FormData) {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const parsed = homeworkSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    deadline: formData.get("deadline"),
    marks: formData.get("marks"),
    status: formData.get("status"),
    classGroupId: formData.get("classGroupId"),
    courseId: formData.get("courseId"),
    externalLinks: formData.get("externalLinks"),
    attachments: formData.get("attachments"),
    studentIds: formData.getAll("studentIds")
  });
  const deadline = parseDateTime(parsed.deadline);
  const classGroup = await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });

  const homework = await prisma.homework.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      deadline,
      marks: parsed.marks,
      status: parsed.status as HomeworkStatus,
      externalLinks: splitLines(parsed.externalLinks),
      instituteId,
      classGroupId: parsed.classGroupId,
      courseId: parsed.courseId ?? classGroup.courseId,
      createdById: userId,
      attachments: {
        create: linkAttachments(parsed.attachments)
      }
    }
  });

  const uploadedAttachments = await saveHomeworkAttachmentFiles(homework.id, formData.getAll("attachmentFiles"));
  if (uploadedAttachments.length) {
    await prisma.homeworkAttachment.createMany({
      data: uploadedAttachments.map((attachment) => ({ ...attachment, homeworkId: homework.id }))
    });
  }

  await syncHomeworkSubmissions(homework.id, instituteId, homework.classGroupId, deadline, parsed.studentIds);

  revalidatePath("/homework");
  redirect(`/homework/${homework.id}`);
}

export async function updateHomeworkAction(homeworkId: string, formData: FormData) {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const parsed = homeworkSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    deadline: formData.get("deadline"),
    marks: formData.get("marks"),
    status: formData.get("status"),
    classGroupId: formData.get("classGroupId"),
    courseId: formData.get("courseId"),
    externalLinks: formData.get("externalLinks"),
    attachments: formData.get("attachments"),
    studentIds: formData.getAll("studentIds")
  });
  const existing = await prisma.homework.findFirst({ where: { id: homeworkId, instituteId } });

  if (!existing) {
    throw new Error("Homework was not found.");
  }

  const deadline = parseDateTime(parsed.deadline);
  const classGroup = await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });
  const uploadedAttachments = await saveHomeworkAttachmentFiles(homeworkId, formData.getAll("attachmentFiles"));

  await prisma.$transaction(async (tx) => {
    await tx.homework.update({
      where: { id: homeworkId },
      data: {
        title: parsed.title,
        description: parsed.description,
        deadline,
        marks: parsed.marks,
        status: parsed.status as HomeworkStatus,
        externalLinks: splitLines(parsed.externalLinks),
        classGroupId: parsed.classGroupId,
        courseId: parsed.courseId ?? classGroup.courseId
      }
    });

    await tx.homeworkAttachment.deleteMany({ where: { homeworkId } });
    const attachments = linkAttachments(parsed.attachments);
    if (attachments.length) {
      await tx.homeworkAttachment.createMany({
        data: attachments.map((attachment) => ({
          homeworkId,
          ...attachment
        }))
      });
    }

    if (uploadedAttachments.length) {
      await tx.homeworkAttachment.createMany({
        data: uploadedAttachments.map((attachment) => ({ ...attachment, homeworkId }))
      });
    }
  });

  await syncHomeworkSubmissions(homeworkId, instituteId, parsed.classGroupId, deadline, parsed.studentIds);

  revalidatePath("/homework");
  revalidatePath(`/homework/${homeworkId}`);
  redirect(`/homework/${homeworkId}`);
}

export async function publishHomework(homeworkId: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    await prisma.homework.update({ where: { id: homeworkId, instituteId }, data: { status: "PUBLISHED" } });
    revalidatePath("/homework");
    revalidatePath(`/homework/${homeworkId}`);
    return { ok: true, message: "Homework published." };
  } catch (error) {
    return actionError(error, "Could not publish homework.");
  }
}

export async function closeHomework(homeworkId: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    await prisma.homework.update({ where: { id: homeworkId, instituteId }, data: { status: "CLOSED" } });
    revalidatePath("/homework");
    revalidatePath(`/homework/${homeworkId}`);
    return { ok: true, message: "Homework closed." };
  } catch (error) {
    return actionError(error, "Could not close homework.");
  }
}

export async function reviewHomeworkSubmission(homeworkId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  const parsed = homeworkSubmissionReviewSchema.parse({
    submissionId: formData.get("submissionId"),
    marksAwarded: formData.get("marksAwarded"),
    feedback: formData.get("feedback"),
    reviewStatus: formData.get("reviewStatus"),
    status: formData.get("status") ?? "REVIEWED"
  });

  await prisma.homeworkSubmission.update({
    where: { id: parsed.submissionId, instituteId },
    data: {
      marksAwarded: parsed.marksAwarded,
      feedback: parsed.feedback ?? null,
      reviewStatus: parsed.reviewStatus,
      status: parsed.status,
      reviewedAt: new Date()
    }
  });

  revalidatePath(`/homework/${homeworkId}`);
  redirect(`/homework/${homeworkId}`);
}
