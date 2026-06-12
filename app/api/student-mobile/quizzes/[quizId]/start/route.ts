import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        instituteId,
        status: "PUBLISHED",
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
        classGroup: { enrollments: { some: { studentId, active: true } } }
      },
      include: { attempts: { where: { studentId } }, questions: { select: { id: true } } }
    });

    if (!quiz) return NextResponse.json({ ok: false, message: "Quiz is not live." }, { status: 404 });
    if (quiz.attempts.length >= quiz.attemptLimit) return NextResponse.json({ ok: false, message: "Attempt limit reached." }, { status: 403 });

    const attemptNo = quiz.attempts.length + 1;
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        instituteId,
        attemptNo,
        answers: { create: quiz.questions.map((question) => ({ questionId: question.id })) }
      }
    });

    return NextResponse.json({ ok: true, attemptId: attempt.id, attemptNo, startedAt: attempt.startedAt.toISOString() });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not start quiz." }, { status: 500 });
  }
}
