import { UsersRound } from "lucide-react";
import { TeachersTable, type TeacherRow } from "@/components/teachers/teachers-table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export const dynamic = "force-dynamic";

function jsonList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(", ") : "";
}

export default async function TeachersPage() {
  const { instituteId } = await getTenantContext();
  const [teachers, branches, classes, settings, paidPayments] = await Promise.all([
    prisma.teacher.findMany({
      where: { instituteId },
      include: {
        branch: true,
        user: { select: { username: true } },
        permissions: true,
        classGroups: { select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } } },
        courses: { select: { id: true } },
        _count: { select: { enrollmentRequests: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ where: { instituteId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.classGroup.findMany({ where: { instituteId }, orderBy: { name: "asc" }, select: { id: true, name: true, teacherId: true } }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } }),
    prisma.payment.findMany({
      where: { instituteId, paidAmount: { gt: 0 } },
      select: {
        paidAmount: true,
        classGroup: { select: { teacherId: true } },
        course: { select: { teacherId: true } }
      }
    })
  ]);

  const revenueByTeacher = new Map<string, number>();
  for (const payment of paidPayments) {
    const teacherId = payment.classGroup?.teacherId ?? payment.course?.teacherId;
    if (!teacherId) continue;
    revenueByTeacher.set(teacherId, (revenueByTeacher.get(teacherId) ?? 0) + Number(payment.paidAmount));
  }

  const data: TeacherRow[] = teachers.map((teacher) => {
    const commissionRate = Number(teacher.commissionRate);
    const grossRevenue = revenueByTeacher.get(teacher.id) ?? 0;

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      username: teacher.user?.username ?? null,
      slug: teacher.slug,
      status: teacher.status,
      specialty: teacher.specialty,
      bio: teacher.bio,
      qualifications: teacher.qualifications,
      subjects: jsonList(teacher.subjects),
      gradesTaught: jsonList(teacher.gradesTaught),
      photoUrl: teacher.photoUrl,
      accentColor: teacher.accentColor,
      heroImage: teacher.heroImage,
      logoUrl: teacher.logoUrl,
      commissionRate,
      grossRevenue,
      commissionDue: grossRevenue * (commissionRate / 100),
      branchId: teacher.branchId ?? "",
      branch: teacher.branch?.name ?? "Unassigned",
      classGroupIds: teacher.classGroups.map((classGroup) => classGroup.id),
      classes: teacher.classGroups.map((classGroup) => classGroup.name).join(", "),
      activeClasses: teacher.classGroups.filter((classGroup) => classGroup.status === "ACTIVE").length,
      students: teacher.classGroups.reduce((total, classGroup) => total + classGroup._count.enrollments, 0),
      courses: teacher.courses.length,
      enrollmentRequests: teacher._count.enrollmentRequests,
      permissions: {
        canCreateStudents: teacher.permissions?.canCreateStudents ?? true,
        canEditStudents: teacher.permissions?.canEditStudents ?? true,
        canDeleteStudents: teacher.permissions?.canDeleteStudents ?? false,
        canCreateClasses: teacher.permissions?.canCreateClasses ?? true,
        canEditClasses: teacher.permissions?.canEditClasses ?? true,
        canManageAttendance: teacher.permissions?.canManageAttendance ?? true,
        canManagePayments: teacher.permissions?.canManagePayments ?? false,
        canVerifyPayments: teacher.permissions?.canVerifyPayments ?? false,
        canCreateCourses: teacher.permissions?.canCreateCourses ?? true,
        canUploadResources: teacher.permissions?.canUploadResources ?? true,
        canManageHomework: teacher.permissions?.canManageHomework ?? true,
        canManageQuizzes: teacher.permissions?.canManageQuizzes ?? true,
        canSendNotifications: teacher.permissions?.canSendNotifications ?? true,
        canSendSms: teacher.permissions?.canSendSms ?? false,
        canExportStudentData: teacher.permissions?.canExportStudentData ?? false,
        canManageStudentCards: teacher.permissions?.canManageStudentCards ?? true,
        canViewFinancialReports: teacher.permissions?.canViewFinancialReports ?? false
      }
    };
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Institute faculty</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Teacher management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add teachers, assign classes, configure subdomains, set commission rates, and control the permissions each teacher receives in the LMS.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
            <UsersRound className="h-6 w-6" />
          </div>
        </div>
      </section>

      <TeachersTable
        data={data}
        branches={branches}
        classes={classes.map((item) => ({ id: item.id, name: item.name, teacherId: item.teacherId }))}
        currency={settings?.currency ?? "LKR"}
      />
    </div>
  );
}
