import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getPortalContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.instituteId) {
    redirect("/portal/login");
  }

  if (session.user.role !== "PARENT" && session.user.role !== "STUDENT") {
    redirect("/dashboard");
  }

  const parent =
    session.user.role === "PARENT"
      ? await prisma.parent.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId },
          include: { students: { orderBy: { firstName: "asc" } } }
        })
      : null;

  const student =
    session.user.role === "STUDENT"
      ? await prisma.student.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId }
        })
      : null;

  const students = parent?.students ?? (student ? [student] : []);

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
