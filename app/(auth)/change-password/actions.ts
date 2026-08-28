"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherPortalUrl } from "@/lib/teacher-tenancy";
import { strongPasswordSchema } from "@/lib/validations";

export type TeacherPasswordChangeState = {
  ok: boolean;
  message: string;
};

const teacherPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password.")
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "The passwords do not match."
});

export async function changeTeacherPassword(
  _: TeacherPasswordChangeState,
  formData: FormData
): Promise<TeacherPasswordChangeState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const parsed = teacherPasswordChangeSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? "")
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Could not change password." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true }
  });

  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, message: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      passwordStatus: "ACTIVE",
      mustChangePassword: false
    }
  });

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto");

  if (session.user.teacherSlug) {
    redirect(teacherPortalUrl(session.user.teacherSlug, "/dashboard", host, protocol));
  }

  redirect("/dashboard");
}
