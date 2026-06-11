import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MobileAuthError, isOperationalRole, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export class AttendanceAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ScannerUser = {
  id: string;
  role: string;
  instituteId: string | null;
  branchId: string | null;
};

async function userFromRequest(request: Request): Promise<ScannerUser> {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    try {
      return await requireOperationalMobileUser(request);
    } catch (error) {
      if (error instanceof MobileAuthError) {
        throw new AttendanceAccessError(error.message, error.statusCode);
      }

      throw error;
    }
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new AttendanceAccessError("Authentication is required.", 401);
  }

  if (!isOperationalRole(session.user.role)) {
    throw new AttendanceAccessError("Students and parents cannot scan attendance.", 403);
  }

  return {
    id: session.user.id,
    role: session.user.role,
    instituteId: session.user.instituteId,
    branchId: session.user.branchId
  };
}

export async function requireAttendanceScannerAccess(request: Request, classGroupId: string) {
  const user = await userFromRequest(request);

  if (!user.instituteId) {
    throw new AttendanceAccessError("This account is not linked to an institute.", 403);
  }

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classGroupId, instituteId: user.instituteId },
    select: {
      id: true,
      branchId: true,
      teacher: { select: { userId: true } }
    }
  });

  if (!classGroup) {
    throw new AttendanceAccessError("Class was not found.", 404);
  }

  if (user.role === "TEACHER" && classGroup.teacher?.userId !== user.id) {
    throw new AttendanceAccessError("You do not have access to scan attendance for this class.", 403);
  }

  if ((user.role === "BRANCH_ADMIN" || user.role === "STAFF") && user.branchId && classGroup.branchId !== user.branchId) {
    throw new AttendanceAccessError("You do not have access to scan attendance for this branch.", 403);
  }

  return { user, classGroup };
}
