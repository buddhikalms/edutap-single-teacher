import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId } = await requireStudentMobileUser(request);
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, active: true },
      include: {
        classGroup: {
          include: {
            course: true,
            teacher: true,
            notices: { orderBy: { createdAt: "desc" }, take: 3 },
            materials: { orderBy: { createdAt: "desc" }, take: 8 }
          }
        }
      },
      orderBy: { enrolledAt: "desc" }
    });

    return NextResponse.json({
      ok: true,
      courses: enrollments.map((enrollment) => ({
        id: enrollment.classGroup.id,
        className: enrollment.classGroup.name,
        code: enrollment.classGroup.code,
        timetable: enrollment.classGroup.schedule,
        room: enrollment.classGroup.room,
        teacherName: enrollment.classGroup.teacher?.name ?? "Unassigned",
        course: {
          id: enrollment.classGroup.course.id,
          name: enrollment.classGroup.course.name,
          subject: enrollment.classGroup.course.subject,
          grade: enrollment.classGroup.course.grade,
          description: enrollment.classGroup.course.description,
          fee: Number(enrollment.classGroup.course.fee)
        },
        announcements: enrollment.classGroup.notices.map((notice) => ({
          id: notice.id,
          title: notice.title,
          body: notice.body,
          createdAt: notice.createdAt.toISOString()
        })),
        materials: enrollment.classGroup.materials.map((material) => ({
          id: material.id,
          title: material.title,
          type: material.type,
          url: material.url
        }))
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load courses." }, { status: 500 });
  }
}
