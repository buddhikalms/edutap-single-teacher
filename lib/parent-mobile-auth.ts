import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireMobileUser } from "@/lib/mobile-auth";

export async function requireParentMobileUser(request: Request) {
  const user = await requireMobileUser(request);

  if (user.role !== "PARENT" && user.role !== "FAMILY") {
    throw new MobileAuthError("Only parent accounts can access the parent app.", 403);
  }

  const parent = await prisma.parent.findFirst({
    where: {
      userId: user.id,
      instituteId: user.instituteId
    },
    include: {
      studentLinks: { select: { studentId: true } },
      students: { select: { id: true } }
    }
  });

  if (!parent) {
    throw new MobileAuthError("This parent account is not linked to a guardian profile.", 403);
  }

  const studentIds = Array.from(new Set([...parent.students.map((student) => student.id), ...parent.studentLinks.map((link) => link.studentId)]));

  return {
    user,
    parent,
    parentId: parent.id,
    userId: user.id,
    instituteId: user.instituteId,
    studentIds
  };
}
