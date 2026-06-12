import { NextResponse } from "next/server";
import { quizAvailability } from "@/lib/learning";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const quizzes = await prisma.quiz.findMany({
      where: {
        instituteId,
        status: "PUBLISHED",
        classGroup: { enrollments: { some: { studentId, active: true } } }
      },
      include: { classGroup: true, attempts: { where: { studentId }, orderBy: { attemptNo: "desc" }, take: 1 } },
      orderBy: { startsAt: "asc" }
    });

    return NextResponse.json({
      ok: true,
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        startsAt: quiz.startsAt.toISOString(),
        endsAt: quiz.endsAt.toISOString(),
        timeLimitMins: quiz.timeLimitMins,
        totalMarks: Number(quiz.totalMarks),
        passMark: Number(quiz.passMark),
        attemptLimit: quiz.attemptLimit,
        className: quiz.classGroup.name,
        availability: quizAvailability(quiz),
        latestAttempt: quiz.attempts[0]
          ? {
              id: quiz.attempts[0].id,
              status: quiz.attempts[0].status,
              score: Number(quiz.attempts[0].score),
              passed: quiz.attempts[0].passed
            }
          : null
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load quizzes." }, { status: 500 });
  }
}
