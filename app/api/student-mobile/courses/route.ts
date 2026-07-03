import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const now = new Date();
    const resourceWhere: Prisma.CourseResourceWhereInput = {
      OR: [
        { visibility: { in: ["FREE_PREVIEW", "ENROLLED"] } },
        { visibility: "SCHEDULED", publishAt: { lte: now } }
      ]
    };
    const courses = await prisma.course.findMany({
      where: {
        instituteId, status: "PUBLISHED",
        OR: [
          { accessType: "FREE" },
          { enrollments: { some: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } } } },
          { resources: { some: { visibility: "FREE_PREVIEW" } } }
        ]
      },
      include: {
        subjectRecord: true, gradeLevel: true,
        modules: { include: { resources: { where: resourceWhere }, quizzes: true }, orderBy: { sortOrder: "asc" } },
        resources: { where: { moduleId: null, ...resourceWhere }, orderBy: { sortOrder: "asc" } },
        enrollments: { where: { studentId }, take: 1 }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ ok: true, courses: courses.map(course => ({
      id: course.id, name: course.name, subject: course.subjectRecord?.name, grade: course.gradeLevel?.name,
      description: course.description, thumbnailUrl: course.thumbnailUrl, accessType: course.accessType,
      price: Number(course.fee), progress: Number(course.enrollments[0]?.progress ?? 0),
      locked: course.accessType !== "FREE" && !course.enrollments[0],
      modules: course.modules.map(module => ({ ...module, quizCount: module.quizzes.length })),
      resources: course.resources
    })) });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    return NextResponse.json({ ok: false, message: "Could not load courses." }, { status: 500 });
  }
}
