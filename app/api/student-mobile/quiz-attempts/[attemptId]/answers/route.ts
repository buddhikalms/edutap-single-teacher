import { NextResponse } from "next/server";
import { quizAnswerSaveSchema } from "@/lib/validations";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const parsed = quizAnswerSaveSchema.parse({ ...(await request.json()), attemptId });
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, studentId, instituteId, status: "IN_PROGRESS" },
      select: { id: true }
    });

    if (!attempt) return NextResponse.json({ ok: false, message: "Active attempt was not found." }, { status: 404 });

    await prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: parsed.questionId } },
      create: {
        attemptId,
        questionId: parsed.questionId,
        selectedOptionId: parsed.selectedOptionId ?? null,
        answerText: parsed.answerText ?? null
      },
      update: {
        selectedOptionId: parsed.selectedOptionId ?? null,
        answerText: parsed.answerText ?? null
      }
    });

    return NextResponse.json({ ok: true, message: "Answer saved." });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not save answer." }, { status: 500 });
  }
}
