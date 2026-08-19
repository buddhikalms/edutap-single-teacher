import { redirect } from "next/navigation";
import { StaffFaceKiosk } from "@/components/face-attendance/StaffFaceKiosk";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { getTenantContext } from "@/lib/session";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function StaffFaceAttendancePage() {
  const context = await getTenantContext();
  if (!canAccess(context.role, "attendance")) redirect("/dashboard");

  const { start, end } = todayRange();
  const classes = await prisma.classGroup.findMany({
    where: { instituteId: context.instituteId, status: "ACTIVE" },
    include: {
      branch: { select: { name: true, location: true } },
      enrollments: {
        where: { active: true, status: "ACTIVE" },
        select: {
          student: {
            select: {
              faceProfile: { select: { status: true, encryptedEmbedding: true } }
            }
          }
        }
      },
      attendanceSessions: {
        where: { sessionDate: { gte: start, lt: end } },
        include: {
          records: { select: { status: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <StaffFaceKiosk
      classes={classes.map((classGroup) => {
        const session = classGroup.attendanceSessions[0] ?? null;
        return {
          id: classGroup.id,
          name: classGroup.name,
          branchName: classGroup.branch.location ? `${classGroup.branch.name} (${classGroup.branch.location})` : classGroup.branch.name,
          faceProfileCount: classGroup.enrollments.filter((enrollment) => enrollment.student.faceProfile?.status === "ACTIVE" && enrollment.student.faceProfile.encryptedEmbedding).length,
          activeSession: session && session.status === "ACTIVE"
            ? {
                id: session.id,
                startsAt: session.startsAt?.toISOString() ?? null,
                present: session.records.filter((record) => record.status === "PRESENT").length,
                late: session.records.filter((record) => record.status === "LATE").length,
                total: session.records.length
              }
            : null
        };
      })}
    />
  );
}
