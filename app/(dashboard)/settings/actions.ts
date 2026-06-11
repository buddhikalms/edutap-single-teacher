"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";

const settingsSchema = z.object({
  instituteName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoPlaceholder: z.string().optional(),
  branchId: z.string().optional(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  branchPhone: z.string().optional(),
  branchAddress: z.string().optional(),
  receiptPrefix: z.string().min(2).max(12),
  receiptFooter: z.string().optional(),
  paymentDueDay: z.coerce.number().int().min(1).max(28),
  attendanceLateAfterMins: z.coerce.number().int().min(0).max(180),
  attendanceAutoAbsent: z.enum(["on"]).optional(),
  currency: z.string().min(3).max(3),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export async function updateInstituteSettings(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { instituteId, role } = await getTenantContext();

    if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role)) {
      return { ok: false, message: "You do not have access to update institute settings." };
    }

    const parsed = settingsSchema.parse(Object.fromEntries(formData));

    await prisma.$transaction(async (tx) => {
      await tx.institute.update({
        where: { id: instituteId },
        data: {
          name: parsed.instituteName,
          email: parsed.email,
          phone: parsed.phone || null,
          address: parsed.address || null,
          logoUrl: parsed.logoPlaceholder || null
        }
      });

      await tx.instituteSettings.upsert({
        where: { instituteId },
        create: {
          instituteId,
          receiptPrefix: parsed.receiptPrefix,
          receiptFooter: parsed.receiptFooter || null,
          paymentDueDay: parsed.paymentDueDay,
          attendanceLateAfterMins: parsed.attendanceLateAfterMins,
          attendanceAutoAbsent: parsed.attendanceAutoAbsent === "on",
          currency: parsed.currency.toUpperCase(),
          themeColor: parsed.themeColor,
          logoPlaceholder: parsed.logoPlaceholder || null
        },
        update: {
          receiptPrefix: parsed.receiptPrefix,
          receiptFooter: parsed.receiptFooter || null,
          paymentDueDay: parsed.paymentDueDay,
          attendanceLateAfterMins: parsed.attendanceLateAfterMins,
          attendanceAutoAbsent: parsed.attendanceAutoAbsent === "on",
          currency: parsed.currency.toUpperCase(),
          themeColor: parsed.themeColor,
          logoPlaceholder: parsed.logoPlaceholder || null
        }
      });

      if (parsed.branchId && parsed.branchName && parsed.branchCode) {
        await tx.branch.update({
          where: { id: parsed.branchId, instituteId },
          data: {
            name: parsed.branchName,
            code: parsed.branchCode,
            phone: parsed.branchPhone || null,
            address: parsed.branchAddress || null
          }
        });
      }
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, message: "Institute settings updated." };
  } catch (error) {
    return actionError(error, "Settings could not be updated.");
  }
}
