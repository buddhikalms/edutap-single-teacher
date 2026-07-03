import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getPortalContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.instituteId) {
    redirect("/portal/login");
  }

  if (!["PARENT", "STUDENT", "FAMILY"].includes(session.user.role)) {
    redirect("/dashboard");
  }
  const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountStatus: true } });
  if (session.user.role === "FAMILY" && account?.accountStatus !== "ACTIVE") redirect("/family/pending");

  const parent =
    session.user.role === "PARENT" || session.user.role === "FAMILY"
      ? await prisma.parent.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId },
          include: {
            students: { orderBy: { firstName: "asc" } },
            studentLinks: { include: { student: true } }
          }
        })
      : null;

  const student =
    session.user.role === "STUDENT"
      ? await prisma.student.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId }
        })
      : null;

  const students = parent
    ? [...parent.students, ...parent.studentLinks.map((link) => link.student)]
        .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
        .sort((a, b) => a.firstName.localeCompare(b.firstName))
    : student ? [student] : [];

  if (students.length === 0) {
    redirect("/portal/login");
  }

  return {
    userId: session.user.id,
    userName: session.user.name ?? "EduTap Portal",
    userEmail: session.user.email ?? "",
    role: session.user.role,
    instituteId: session.user.instituteId,
    currency:
      (
        await prisma.instituteSettings.findUnique({
          where: { instituteId: session.user.instituteId },
          select: { currency: true }
        })
      )?.currency ?? "USD",
    parent,
    students,
    studentIds: students.map((item) => item.id)
  };
}
