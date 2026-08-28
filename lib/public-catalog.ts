import { prisma } from "@/lib/prisma";
import { getTeacherSlugFromRequest } from "@/lib/teacher-tenancy";

export function classPublicKey(item: { id: string; name: string }) {
  const slug = item.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "class"}--${item.id}`;
}

export function classIdFromPublicKey(value: string) {
  return value.includes("--") ? value.slice(value.lastIndexOf("--") + 2) : value;
}

export async function getPublicTeacher(slug?: string | null) {
  const teacherSlug = slug === undefined ? await getTeacherSlugFromRequest() : slug;

  return prisma.teacher.findFirst({
    where: {
      ...(teacherSlug ? { slug: teacherSlug } : { userId: { not: null } }),
      institute: { active: true }
    },
    include: {
      user: { select: { id: true } },
      branch: true,
      institute: { include: { settings: { select: { currency: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function getPublicClasses(teacherSlug?: string | null) {
  const teacher = await getPublicTeacher(teacherSlug);
  if (!teacher) return [];
  if (teacher.status === "INACTIVE") return [];

  const rows = await prisma.classGroup.findMany({
    where: {
      instituteId: teacher.instituteId,
      teacherId: teacher.id,
      status: "ACTIVE",
      gradeId: { not: null }
    },
    include: {
      gradeLevel: true,
      subject: true,
      branch: true,
      teacher: { select: { name: true } },
      _count: { select: { enrollments: { where: { active: true } } } }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return rows.map((item) => ({
    id: item.id,
    key: classPublicKey(item),
    name: item.name,
    description: `${item.subject.name} tuition for ${item.gradeLevel?.name ?? "students"}, with attendance, homework, quizzes, resources, and parent updates in one connected learning experience.`,
    gradeId: item.gradeId!,
    grade: item.gradeLevel!.name,
    subjectId: item.subjectId,
    subject: item.subject.name,
    subjectColor: item.subject.color,
    classType: item.classType,
    schedule: item.schedule,
    location: item.room || item.branch?.location || item.branch?.name || "Online",
    branch: item.branch?.name ?? "Online",
    monthlyFee: item.monthlyFee?.toNumber() ?? 0,
    admissionFee: item.admissionFee?.toNumber() ?? null,
    paymentStartDate: item.paymentStartDate?.toISOString() ?? null,
    freePeriodType: item.defaultFreePeriodType,
    freeDays: item.defaultFreeDays,
    dueDay: item.defaultPaymentDueDay,
    capacity: item.capacity,
    enrolled: item._count.enrollments,
    availableSeats: Math.max(0, item.capacity - item._count.enrollments),
    teacherName: item.teacher?.name ?? teacher.name
  }));
}

export async function getPublicClass(value: string, teacherSlug?: string | null) {
  const id = classIdFromPublicKey(value);
  const classes = await getPublicClasses(teacherSlug);
  return classes.find((item) => item.id === id) ?? null;
}

export async function getPublicCourses(teacherSlug?: string | null) {
  const teacher = await getPublicTeacher(teacherSlug);
  if (!teacher) return [];
  if (teacher.status === "INACTIVE") return [];

  const rows = await prisma.course.findMany({
    where: { instituteId: teacher.instituteId, teacherId: teacher.id, status: "PUBLISHED" },
    include: {
      subjectRecord: true,
      gradeLevel: true,
      teacher: { select: { name: true } },
      _count: { select: { modules: true, resources: true, quizzes: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return rows.map((course) => ({
    id: course.id,
    slug: course.slug || course.id,
    title: course.name,
    subject: course.subjectRecord?.name ?? course.subject ?? "Learning",
    grade: course.gradeLevel?.name ?? course.grade,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    durationType: course.durationType,
    durationValue: course.durationValue,
    accessType: course.accessType,
    price: course.fee.toNumber(),
    isFree: course.isFree || course.accessType === "FREE",
    startDate: course.startDate?.toISOString() ?? null,
    endDate: course.endDate?.toISOString() ?? null,
    teacherName: course.teacher?.name ?? teacher.name,
    moduleCount: course._count.modules,
    resourceCount: course._count.resources,
    quizCount: course._count.quizzes
  }));
}

export async function getPublicCourse(slug: string, teacherSlug?: string | null) {
  const teacher = await getPublicTeacher(teacherSlug);
  if (!teacher) return null;
  if (teacher.status === "INACTIVE") return null;

  const course = await prisma.course.findFirst({
    where: {
      instituteId: teacher.instituteId,
      teacherId: teacher.id,
      status: "PUBLISHED",
      OR: [{ slug }, { id: slug }]
    },
    include: {
      subjectRecord: true,
      gradeLevel: true,
      teacher: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { resources: { orderBy: { sortOrder: "asc" } }, quizzes: { select: { id: true, title: true } } }
      }
    }
  });

  if (!course) return null;
  return {
    id: course.id,
    slug: course.slug || course.id,
    title: course.name,
    subject: course.subjectRecord?.name ?? course.subject ?? "Learning",
    grade: course.gradeLevel?.name ?? course.grade,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    durationType: course.durationType,
    durationValue: course.durationValue,
    accessType: course.accessType,
    price: course.fee.toNumber(),
    isFree: course.isFree || course.accessType === "FREE",
    startDate: course.startDate?.toISOString() ?? null,
    endDate: course.endDate?.toISOString() ?? null,
    teacherName: course.teacher?.name ?? teacher.name,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      isFreePreview: module.isFreePreview,
      resources: module.resources.map((resource) => ({ id: resource.id, title: resource.title, type: resource.resourceType })),
      quizzes: module.quizzes
    }))
  };
}
