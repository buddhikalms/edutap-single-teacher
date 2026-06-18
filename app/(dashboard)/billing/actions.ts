"use server";

import { SubscriptionPlanKey, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { planDefinitions } from "@/lib/subscription-plans";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export async function changeSubscriptionPlan(formData: FormData) {
  const { instituteId, role } = await getTenantContext();

  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN"].includes(role)) {
    throw new Error("You do not have access to manage billing.");
  }

  const plan = formData.get("plan");
  if (!plan || !Object.values(SubscriptionPlanKey).includes(plan as SubscriptionPlanKey)) {
    throw new Error("Invalid subscription plan.");
  }

  const definition = planDefinitions.find((item) => item.id === plan);
  if (!definition) {
    throw new Error("Subscription plan is not available.");
  }

  await prisma.instituteSubscription.upsert({
    where: { instituteId },
    create: {
      instituteId,
      plan: definition.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyPrice: definition.price,
      yearlyPrice: definition.yearlyPrice,
      studentLimit: definition.studentLimit,
      teacherLimit: definition.teacherLimit,
      branchLimit: definition.branchLimit,
      classLimit: definition.classLimit,
      courseLimit: definition.courseLimit,
      storageLimitMb: definition.storageLimitMb,
      smsCredits: definition.smsCredits,
      liveClassAccess: definition.liveClassAccess,
      parentNotificationAccess: definition.parentNotificationAccess,
      customBrandingAccess: definition.customBrandingAccess
    },
    update: {
      plan: definition.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyPrice: definition.price,
      yearlyPrice: definition.yearlyPrice,
      studentLimit: definition.studentLimit,
      teacherLimit: definition.teacherLimit,
      branchLimit: definition.branchLimit,
      classLimit: definition.classLimit,
      courseLimit: definition.courseLimit,
      storageLimitMb: definition.storageLimitMb,
      smsCredits: definition.smsCredits,
      liveClassAccess: definition.liveClassAccess,
      parentNotificationAccess: definition.parentNotificationAccess,
      customBrandingAccess: definition.customBrandingAccess
    }
  });

  revalidatePath("/billing");
  revalidatePath("/admin");
}
