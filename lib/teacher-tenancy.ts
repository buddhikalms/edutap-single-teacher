import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export const RESERVED_TEACHER_SLUGS = new Set(["www", "app", "admin", "api", "student", "parent", "support"]);

export const TEACHER_PERMISSION_KEYS = [
  "canCreateStudents",
  "canEditStudents",
  "canDeleteStudents",
  "canCreateClasses",
  "canEditClasses",
  "canManageAttendance",
  "canManagePayments",
  "canVerifyPayments",
  "canCreateCourses",
  "canUploadResources",
  "canManageHomework",
  "canManageQuizzes",
  "canSendNotifications",
  "canSendSms",
  "canExportStudentData",
  "canManageStudentCards",
  "canViewFinancialReports"
] as const;

export type TeacherPermissionKey = (typeof TEACHER_PERMISSION_KEYS)[number];

const defaultTeacherPermissions: Record<TeacherPermissionKey, boolean> = {
  canCreateStudents: true,
  canEditStudents: true,
  canDeleteStudents: false,
  canCreateClasses: true,
  canEditClasses: true,
  canManageAttendance: true,
  canManagePayments: false,
  canVerifyPayments: false,
  canCreateCourses: true,
  canUploadResources: true,
  canManageHomework: true,
  canManageQuizzes: true,
  canSendNotifications: true,
  canSendSms: false,
  canExportStudentData: false,
  canManageStudentCards: true,
  canViewFinancialReports: false
};

export function normalizeTeacherSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assertValidTeacherSlug(value: string) {
  const slug = normalizeTeacherSlug(value);

  if (!slug || slug.length < 3) {
    throw new Error("Teacher subdomain must be at least 3 characters.");
  }

  if (RESERVED_TEACHER_SLUGS.has(slug)) {
    throw new Error("This subdomain is reserved for EduTap.");
  }

  return slug;
}

export function teacherPortalUrl(slug: string, path = "/dashboard", requestHost?: string | null, protocol?: string | null) {
  const cleanSlug = normalizeTeacherSlug(slug);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const host = requestHost?.split(":")[0]?.toLowerCase() ?? "";
  const port = requestHost?.includes(":") ? `:${requestHost.split(":").pop()}` : "";
  const isLocal = host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? (isLocal ? "lvh.me" : "edutap.lk");
  const scheme = protocol ?? (isLocal ? "http" : "https");

  return `${scheme}://${cleanSlug}.${rootDomain}${isLocal ? port : ""}${normalizedPath}`;
}

export async function getTeacherSlugFromRequest() {
  const headerList = await headers();
  const explicit = headerList.get("x-edutap-teacher-slug");

  if (explicit) {
    return normalizeTeacherSlug(explicit);
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "edutap.lk";
  const localRootDomain = "localhost";

  const activeRootDomain = hostname.endsWith(`.${rootDomain}`)
    ? rootDomain
    : hostname.endsWith(`.${localRootDomain}`)
      ? localRootDomain
      : null;

  if (!activeRootDomain) {
    return null;
  }

  const subdomain = hostname.slice(0, -activeRootDomain.length - 1);
  if (!subdomain || RESERVED_TEACHER_SLUGS.has(subdomain) || subdomain.includes(".")) {
    return null;
  }

  return normalizeTeacherSlug(subdomain);
}

export async function getRequestTeacherContext() {
  const slug = await getTeacherSlugFromRequest();
  if (!slug) return null;

  return prisma.teacher.findUnique({
    where: { slug },
    include: {
      branch: true,
      institute: { include: { settings: { select: { currency: true, themeColor: true, logoPlaceholder: true } } } },
      permissions: true
    }
  });
}

export async function getAuthenticatedTeacherContext() {
  const tenant = await getTenantContext();

  if (tenant.role !== "TEACHER") {
    return { ...tenant, teacher: null };
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: tenant.userId, instituteId: tenant.instituteId },
    include: { permissions: true }
  });

  if (!teacher) {
    redirect("/login");
  }

  return { ...tenant, teacher };
}

export async function requireTeacherPermission(permission: TeacherPermissionKey) {
  const context = await getAuthenticatedTeacherContext();

  if (context.role !== "TEACHER") {
    return context;
  }

  const teacher = context.teacher;
  if (!teacher || !(teacher.permissions?.[permission] ?? defaultTeacherPermissions[permission])) {
    throw new Error("You do not have permission to perform this action.");
  }

  return context;
}

export async function resolveAssignableTeacherId(inputTeacherId?: string | null, permission?: TeacherPermissionKey) {
  const context = permission ? await requireTeacherPermission(permission) : await getAuthenticatedTeacherContext();

  if (context.role === "TEACHER") {
    if (!context.teacher) {
      throw new Error("Teacher profile is missing.");
    }
    return {
      ...context,
      teacherId: context.teacher.id
    };
  }

  if (!inputTeacherId) {
    return { ...context, teacherId: null };
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: inputTeacherId, instituteId: context.instituteId },
    select: { id: true }
  });

  if (!teacher) {
    throw new Error("Invalid teacher assignment.");
  }

  return { ...context, teacherId: teacher.id };
}

export function teacherScopedWhere(role: string, teacherId: string | null | undefined) {
  return role === "TEACHER" && teacherId ? { teacherId } : {};
}
