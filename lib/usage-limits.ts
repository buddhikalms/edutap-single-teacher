import { prisma } from "@/lib/prisma";

export type UsageMetric = "teachers" | "students" | "branches" | "classes" | "courses";

const metricConfig: Record<UsageMetric, { label: string; limitField: "teacherLimit" | "studentLimit" | "branchLimit" | "classLimit" | "courseLimit" }> = {
  teachers: { label: "teachers", limitField: "teacherLimit" },
  students: { label: "students", limitField: "studentLimit" },
  branches: { label: "branches", limitField: "branchLimit" },
  classes: { label: "classes", limitField: "classLimit" },
  courses: { label: "courses", limitField: "courseLimit" }
};

export async function assertCanCreateWithinLimit(instituteId: string, metric: UsageMetric) {
  const subscription = await prisma.instituteSubscription.findUnique({ where: { instituteId } });
  if (!subscription) {
    return;
  }

  const config = metricConfig[metric];
  const limit = Number(subscription[config.limitField]);
  if (!Number.isFinite(limit) || limit <= 0 || limit >= 999999) {
    return;
  }

  const used = await countUsage(instituteId, metric);
  if (used >= limit) {
    throw new PackageLimitError(config.label, limit);
  }
}

async function countUsage(instituteId: string, metric: UsageMetric) {
  switch (metric) {
    case "teachers":
      return prisma.teacher.count({ where: { instituteId } });
    case "students":
      return prisma.student.count({ where: { instituteId } });
    case "branches":
      return prisma.branch.count({ where: { instituteId } });
    case "classes":
      return prisma.classGroup.count({ where: { instituteId } });
    case "courses":
      return prisma.course.count({ where: { instituteId } });
  }
}

export class PackageLimitError extends Error {
  constructor(public readonly metric: string, public readonly limit: number) {
    super(`You have reached your package limit. Upgrade to continue. (${limit} ${metric})`);
    this.name = "PackageLimitError";
  }
}

export function packageLimitMessage(error: unknown) {
  if (error instanceof PackageLimitError) {
    return "You have reached your package limit. Upgrade to continue.";
  }

  return null;
}
