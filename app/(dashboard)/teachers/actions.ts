"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { normalizeSmsRecipient, sendSmsLenzSms } from "@/lib/smslenz-sms";
import { assertValidTeacherSlug } from "@/lib/teacher-tenancy";
import { assertCanCreateWithinLimit, packageLimitMessage } from "@/lib/usage-limits";
import { teacherSchema, type TeacherInput } from "@/lib/validations";

async function assertTeacherRelations(instituteId: string, input: TeacherInput) {
  if (input.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, instituteId },
      select: { id: true }
    });

    if (!branch) {
      throw new Error("Invalid branch.");
    }
  }

  if (input.classGroupIds.length) {
    const count = await prisma.classGroup.count({
      where: { id: { in: input.classGroupIds }, instituteId }
    });

    if (count !== input.classGroupIds.length) {
      throw new Error("Invalid class assignment.");
    }
  }
}

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "";
    if (target.includes("username")) return "This username is already in use.";
    if (target.includes("mobile")) return "This mobile number is already linked to another user.";
    return "A teacher with this email, username, or subdomain already exists.";
  }

  return null;
}

function normalizeLoginMobile(value: string | null | undefined) {
  return value ? value.replace(/[^\d+]/g, "") : null;
}

function defaultUsername(name: string, phone: string | null | undefined) {
  const phoneTail = phone?.replace(/\D/g, "").slice(-4);
  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 28);

  return [namePart || "teacher", phoneTail].filter(Boolean).join(".");
}

function temporaryPassword() {
  return `Et@${randomBytes(6).toString("base64url")}9`;
}

function appLoginUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";

  return new URL("/login", baseUrl).toString();
}

async function sendTeacherCredentialsSms(input: {
  instituteId: string;
  userId: string;
  teacherId: string;
  phone: string | null | undefined;
  name: string;
  username: string;
  password: string;
}) {
  const recipient = normalizeSmsRecipient(input.phone);
  if (!recipient) {
    return { sent: false, message: "Teacher login saved, but SMS was not sent because the mobile number is invalid." };
  }

  const body = `EduTap login for ${input.name}: ${appLoginUrl()} Username: ${input.username} Password: ${input.password}. Change this password at first login.`;
  const result = await sendSmsLenzSms({ recipient, message: body });

  await prisma.notificationLog.create({
    data: {
      instituteId: input.instituteId,
      userId: input.userId,
      type: NotificationType.NOTICE,
      channel: NotificationChannel.SMS,
      status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
      title: "Teacher login credentials",
      body,
      message: body,
      target: recipient,
      provider: result.provider,
      providerRef: result.providerRef ?? null,
      recipientType: "TEACHER",
      recipientId: input.teacherId,
      payloadJson: {
        source: "teacher-management",
        provider: "smslenz",
        statusCode: result.statusCode
      },
      metadata: {
        providerResponse: result.response === undefined ? null : (JSON.parse(JSON.stringify(result.response)) as Prisma.InputJsonValue)
      },
      errorMessage: result.error ?? null,
      error: result.error ?? null,
      sentAt: result.ok ? new Date() : null
    }
  });

  return {
    sent: result.ok,
    message: result.ok ? "Teacher saved and login SMS sent." : `Teacher login saved, but SMS failed: ${result.error || "SMSLenz rejected the message."}`
  };
}

export async function createTeacher(input: TeacherInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = teacherSchema.parse(input);
    const slug = assertValidTeacherSlug(parsed.slug);
    await assertCanCreateWithinLimit(instituteId, "teachers");
    await assertTeacherRelations(instituteId, parsed);
    const username = parsed.username ?? defaultUsername(parsed.name, parsed.phone);
    const plainPassword = parsed.password ?? temporaryPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.name,
          username,
          email: parsed.email.toLowerCase(),
          mobile: normalizeLoginMobile(parsed.phone),
          passwordHash,
          passwordStatus: "RESET_REQUIRED",
          mustChangePassword: true,
          role: "TEACHER",
          accountStatus: parsed.status === "ACTIVE" ? "ACTIVE" : "REJECTED",
          instituteId,
          branchId: parsed.branchId ?? null
        }
      });

      return tx.teacher.create({
        data: {
          name: parsed.name,
          displayName: parsed.name,
          email: parsed.email.toLowerCase(),
          phone: parsed.phone ?? null,
          mobile: parsed.phone ?? null,
          slug,
          status: parsed.status,
          specialty: parsed.specialty ?? null,
          bio: parsed.bio ?? null,
          qualifications: parsed.qualifications ?? null,
          subjects: parsed.subjects ? parsed.subjects.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
          gradesTaught: parsed.gradesTaught ? parsed.gradesTaught.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
          photoUrl: parsed.photoUrl ?? null,
          profileImage: parsed.photoUrl ?? null,
          accentColor: parsed.accentColor,
          heroImage: parsed.heroImage ?? null,
          logoUrl: parsed.logoUrl ?? null,
          commissionRate: parsed.commissionRate,
          instituteId,
          branchId: parsed.branchId ?? null,
          userId: user.id,
          permissions: { create: parsed.permissions }
        }
      });
    });

    if (parsed.classGroupIds.length) {
      await prisma.classGroup.updateMany({
        where: { id: { in: parsed.classGroupIds }, instituteId },
        data: { teacherId: teacher.id }
      });
    }

    revalidatePath("/teachers");
    revalidatePath("/classes");
    if (parsed.sendCredentialsSms) {
      const sms = await sendTeacherCredentialsSms({
        instituteId,
        userId: teacher.userId!,
        teacherId: teacher.id,
        phone: parsed.phone,
        name: parsed.name,
        username,
        password: plainPassword
      });
      return { ok: true, message: sms.message };
    }

    return { ok: true, message: "Teacher added and login credentials saved." };
  } catch (error) {
    const limit = packageLimitMessage(error);
    if (limit) {
      return { ok: false, message: limit };
    }

    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not add teacher.");
  }
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = teacherSchema.parse(input);
    const slug = assertValidTeacherSlug(parsed.slug);
    await assertTeacherRelations(instituteId, parsed);

    const teacher = await prisma.teacher.findFirst({
      where: { id, instituteId },
      select: { id: true, userId: true }
    });

    if (!teacher) {
      return { ok: false, message: "Teacher was not found." };
    }

    const username = parsed.username ?? defaultUsername(parsed.name, parsed.phone);
    const plainPassword = parsed.password ?? (parsed.sendCredentialsSms || !teacher.userId ? temporaryPassword() : undefined);
    const passwordHash = plainPassword ? await bcrypt.hash(plainPassword, 12) : null;
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      const user = teacher.userId
        ? await tx.user.update({
            where: { id: teacher.userId },
            data: {
              name: parsed.name,
              username,
              email: parsed.email.toLowerCase(),
              mobile: normalizeLoginMobile(parsed.phone),
              ...(passwordHash
                ? {
                    passwordHash,
                    passwordStatus: "RESET_REQUIRED" as const,
                    mustChangePassword: true
                  }
                : {}),
              accountStatus: parsed.status === "ACTIVE" ? "ACTIVE" : "REJECTED",
              instituteId,
              branchId: parsed.branchId ?? null
            },
            select: { id: true }
          })
        : await tx.user.create({
            data: {
              name: parsed.name,
              username,
              email: parsed.email.toLowerCase(),
              mobile: normalizeLoginMobile(parsed.phone),
              passwordHash: passwordHash!,
              passwordStatus: "RESET_REQUIRED",
              mustChangePassword: true,
              role: "TEACHER",
              accountStatus: parsed.status === "ACTIVE" ? "ACTIVE" : "REJECTED",
              instituteId,
              branchId: parsed.branchId ?? null
            },
            select: { id: true }
          });

      const savedTeacher = await tx.teacher.update({
        where: { id },
        data: {
          name: parsed.name,
          displayName: parsed.name,
          email: parsed.email.toLowerCase(),
          phone: parsed.phone ?? null,
          mobile: parsed.phone ?? null,
          slug,
          status: parsed.status,
          specialty: parsed.specialty ?? null,
          bio: parsed.bio ?? null,
          qualifications: parsed.qualifications ?? null,
          subjects: parsed.subjects ? parsed.subjects.split(",").map((item) => item.trim()).filter(Boolean) : Prisma.JsonNull,
          gradesTaught: parsed.gradesTaught ? parsed.gradesTaught.split(",").map((item) => item.trim()).filter(Boolean) : Prisma.JsonNull,
          photoUrl: parsed.photoUrl ?? null,
          profileImage: parsed.photoUrl ?? null,
          accentColor: parsed.accentColor,
          heroImage: parsed.heroImage ?? null,
          logoUrl: parsed.logoUrl ?? null,
          commissionRate: parsed.commissionRate,
          branchId: parsed.branchId ?? null,
          userId: user.id,
          permissions: {
            upsert: {
              create: parsed.permissions,
              update: parsed.permissions
            }
          }
        }
      });

      await tx.classGroup.updateMany({
        where: { instituteId, teacherId: id, id: { notIn: parsed.classGroupIds } },
        data: { teacherId: null }
      });

      if (parsed.classGroupIds.length) {
        await tx.classGroup.updateMany({
          where: { instituteId, id: { in: parsed.classGroupIds } },
          data: { teacherId: id }
        });
      }

      return savedTeacher;
    });

    revalidatePath("/teachers");
    revalidatePath(`/teachers/${id}`);
    revalidatePath("/classes");
    revalidatePath("/");
    if (parsed.sendCredentialsSms && plainPassword) {
      const sms = await sendTeacherCredentialsSms({
        instituteId,
        userId: updatedTeacher.userId!,
        teacherId: updatedTeacher.id,
        phone: parsed.phone,
        name: parsed.name,
        username,
        password: plainPassword
      });
      return { ok: true, message: sms.message };
    }

    return { ok: true, message: "Teacher updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not update teacher.");
  }
}

export async function deleteTeacher(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const teacher = await prisma.teacher.findFirst({
      where: { id, instituteId },
      select: { id: true, userId: true }
    });

    if (!teacher) {
      return { ok: false, message: "Teacher was not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.delete({ where: { id } });
      if (teacher.userId) {
        await tx.user.delete({ where: { id: teacher.userId } });
      }
    });
    revalidatePath("/teachers");
    revalidatePath("/classes");
    return { ok: true, message: "Teacher removed." };
  } catch (error) {
    return actionError(error, "Could not delete teacher.");
  }
}
