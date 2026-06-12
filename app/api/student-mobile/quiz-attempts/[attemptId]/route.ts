import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, studentId, instituteId },
      include: {
        quiz: true,
        answers: { include: { question: true, selectedOption: true }, orderBy: { question: { order: "asc" } } }
      }
    });

    if (!attempt) return NextResponse.json({ ok: false, message: "Attempt was not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        score: Number(attempt.score),
        passed: attempt.passed,
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
          totalMarks: Number(attempt.quiz.totalMarks),
          passMark: Number(attempt.quiz.passMark)
        },
        answers: attempt.answers.map((answer) => ({
          id: answer.id,
          question: answer.question.prompt,
          type: answer.question.type,
          answerText: answer.answerText,
          selectedOption: answer.selectedOption ? { label: answer.selectedOption.label, text: answer.selectedOption.text } : null,
          marksAwarded: Number(answer.marksAwarded),
          feedback: answer.feedback,
          isCorrect: answer.isCorrect
        }))
      }
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load attempt." }, { status: 500 });
  }
}
