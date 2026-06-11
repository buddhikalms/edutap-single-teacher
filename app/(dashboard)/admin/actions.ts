"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleInstituteStatus(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Only super admins can manage institute status.");
  }

  const instituteId = String(formData.get("instituteId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  await prisma.institute.update({
    where: { id: instituteId },
    data: { active }
  });

  revalidatePath("/admin");
}
