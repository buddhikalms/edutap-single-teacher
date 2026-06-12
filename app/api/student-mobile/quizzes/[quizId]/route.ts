import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        instituteId,
        status: "PUBLISHED",
        classGroup: { enrollments: { some: { studentId, active: true } } }
      },
      include: {
        classGroup: true,
        attempts: { where: { studentId }, orderBy: { attemptNo: "desc" } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
              select: { id: true, label: true, text: true, order: true }
            }
          }
        }
      }
    });

    if (!quiz) return NextResponse.json({ ok: false, message: "Quiz was not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        startsAt: quiz.startsAt.toISOString(),
        endsAt: quiz.endsAt.toISOString(),
        timeLimitMins: quiz.timeLimitMins,
        totalMarks: Number(quiz.totalMarks),
        passMark: Number(quiz.passMark),
        attemptLimit: quiz.attemptLimit,
        className: quiz.classGroup.name,
        attemptsUsed: quiz.attempts.length,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          marks: Number(question.marks),
          order: question.order,
          options: question.options
        }))
      }
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load quiz." }, { status: 500 });
  }
}
