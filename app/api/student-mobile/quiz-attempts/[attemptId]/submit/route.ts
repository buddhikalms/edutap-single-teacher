import { NextResponse } from "next/server";
import { autoMarkQuestion } from "@/lib/learning";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";
import { sendStudentWebPush } from "@/lib/web-push";

type RouteContext = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { attemptId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, studentId, instituteId },
      include: {
        quiz: true,
        answers: { include: { selectedOption: true, question: true } }
      }
    });

    if (!attempt) return NextResponse.json({ ok: false, message: "Attempt was not found." }, { status: 404 });

    let autoScore = 0;
    let needsManual = false;
    for (const answer of attempt.answers) {
      if (answer.question.type === "SHORT_ANSWER" || answer.question.type === "ESSAY") {
        needsManual = true;
        continue;
      }
      const marks = autoMarkQuestion({
        type: answer.question.type,
        marks: Number(answer.question.marks),
        correctAnswer: answer.question.correctAnswer,
        selectedOption: answer.selectedOption,
        answerText: answer.answerText
      });
      autoScore += marks;
      await prisma.quizAnswer.update({ where: { id: answer.id }, data: { marksAwarded: marks, isCorrect: marks >= Number(answer.question.marks) } });
    }

    const saved = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: needsManual ? "SUBMITTED" : "AUTO_MARKED",
        submittedAt: new Date(),
        autoScore,
        score: autoScore,
        passed: autoScore >= Number(attempt.quiz.passMark)
      }
    });

    const notification = await prisma.notification.create({
      data: {
        instituteId,
        studentId,
        title: "Quiz submitted",
        message: `${attempt.quiz.title} was submitted successfully.`,
        type: "NOTICE",
        actionUrl: `/student/quizzes/results/${attempt.id}`
      }
    });

    await sendStudentWebPush({
      instituteId,
      studentId,
      notificationId: notification.id,
      type: "NOTICE",
      title: "Quiz submitted",
      body: `${attempt.quiz.title} was submitted successfully.`,
      data: { actionUrl: `/student/quizzes/results/${attempt.id}`, quizId: attempt.quizId, attemptId: attempt.id }
    }).catch((error) => console.error("Student quiz web push failed", error));

    return NextResponse.json({ ok: true, message: "Quiz submitted.", score: Number(saved.score), passed: saved.passed, needsManualReview: needsManual });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not submit quiz." }, { status: 500 });
  }
}
