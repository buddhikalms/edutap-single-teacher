import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";

export class StudentFaceAuthError extends Error {
  statusCode: number;

  constructor(message = "Student authentication is required.", statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function requireFaceStudent(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    try {
      return await requireStudentMobileUser(request);
    } catch (error) {
      if (error instanceof StudentMobileAuthError) throw new StudentFaceAuthError(error.message, error.statusCode);
      throw error;
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT" || !session.user.instituteId) {
    throw new StudentFaceAuthError();
  }

  const student = await prisma.student.findFirst({
    where: { userId: session.user.id, instituteId: session.user.instituteId },
    include: {
      parents: true,
      institute: { select: { id: true, name: true, logoUrl: true } },
      branch: { select: { id: true, name: true } }
    }
  });
  if (!student) throw new StudentFaceAuthError();
  return { student, studentId: student.id, instituteId: student.instituteId };
}

export function studentFaceAuthResponse(error: unknown) {
  if (error instanceof StudentFaceAuthError) {
    return Response.json({ ok: false, message: error.message }, { status: error.statusCode });
  }
  return null;
}
