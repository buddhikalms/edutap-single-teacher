import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getStudentWebContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT" || !session.user.instituteId) redirect("/student/login");
  const student = await prisma.student.findFirst({
    where: { userId: session.user.id, instituteId: session.user.instituteId },
    include: { user: true, branch: true }
  });
  if (!student) redirect("/student/login");
  const settings = await prisma.instituteSettings.findUnique({ where: { instituteId: session.user.instituteId }, select: { currency: true } });
  return { session, student, studentId: student.id, instituteId: session.user.instituteId, currency: settings?.currency ?? "LKR" };
}

export async function canAccessCourse(studentId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { accessType: true, status: true } });
  if (!course || course.status !== "PUBLISHED") return false;
  if (course.accessType === "FREE") return true;
  return Boolean(await prisma.courseEnrollment.findFirst({ where: { studentId, courseId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { id: true } }));
}
