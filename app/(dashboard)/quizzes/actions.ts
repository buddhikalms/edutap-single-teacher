"use server";

import { QuizQuestionType, QuizStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCanManageClass, autoMarkQuestion, parseDateTime } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { quizManualMarkSchema, quizQuestionSchema, quizSchema } from "@/lib/validations";

function parseOptions(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line, index) => {
      const [label, text, isCorrect] = line.split("|").map((item) => item?.trim());
      if (!label || !text) return null;
      return { label, text, isCorrect: isCorrect === "true" || isCorrect === "1" || isCorrect === "*", order: index };
    })
    .filter(Boolean) as Array<{ label: string; text: string; isCorrect: boolean; order: number }>;
}

export async function createQuizAction(formData: FormData) {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const parsed = quizSchema.parse(Object.fromEntries(formData));
  const classGroup = await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });

  const quiz = await prisma.quiz.create({
    data: {
      title: parsed.title,
      description: parsed.description ?? null,
      instructions: parsed.instructions ?? null,
      startsAt: parseDateTime(parsed.startsAt),
      endsAt: parseDateTime(parsed.endsAt),
      timeLimitMins: parsed.timeLimitMins,
      totalMarks: parsed.totalMarks,
      passMark: parsed.passMark,
      attemptLimit: parsed.attemptLimit,
      status: parsed.status as QuizStatus,
      classGroupId: parsed.classGroupId,
      courseId: parsed.courseId ?? classGroup.courseId,
      instituteId,
      createdById: userId
    }
  });

  revalidatePath("/quizzes");
  redirect(`/quizzes/${quiz.id}/questions`);
}

export async function updateQuizAction(quizId: string, formData: FormData) {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const parsed = quizSchema.parse(Object.fromEntries(formData));
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, instituteId }, select: { id: true } });

  if (!quiz) {
    throw new Error("Quiz was not found.");
  }

  const classGroup = await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: parsed.title,
      description: parsed.description ?? null,
      instructions: parsed.instructions ?? null,
      startsAt: parseDateTime(parsed.startsAt),
      endsAt: parseDateTime(parsed.endsAt),
      timeLimitMins: parsed.timeLimitMins,
      totalMarks: parsed.totalMarks,
      passMark: parsed.passMark,
      attemptLimit: parsed.attemptLimit,
      status: parsed.status as QuizStatus,
      classGroupId: parsed.classGroupId,
      courseId: parsed.courseId ?? classGroup.courseId
    }
  });

  revalidatePath("/quizzes");
  revalidatePath(`/quizzes/${quizId}/edit`);
  redirect(`/quizzes/${quizId}/questions`);
}

export async function setQuizStatus(quizId: string, status: QuizStatus): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    await prisma.quiz.update({ where: { id: quizId, instituteId }, data: { status } });
    revalidatePath("/quizzes");
    revalidatePath(`/quizzes/${quizId}/questions`);
    return { ok: true, message: "Quiz status updated." };
  } catch (error) {
    return actionError(error, "Could not update quiz status.");
  }
}

export async function upsertQuizQuestion(quizId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  const parsed = quizQuestionSchema.parse({
    quizId,
    questionId: formData.get("questionId"),
    type: formData.get("type"),
    prompt: formData.get("prompt"),
    explanation: formData.get("explanation"),
    marks: formData.get("marks"),
    order: formData.get("order") ?? 0,
    correctAnswer: formData.get("correctAnswer"),
    options: parseOptions(formData.get("options"))
  });

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, instituteId }, select: { id: true } });
  if (!quiz) {
    throw new Error("Quiz was not found.");
  }

  const question = parsed.questionId
    ? await prisma.quizQuestion.update({
        where: { id: parsed.questionId },
        data: {
          type: parsed.type as QuizQuestionType,
          prompt: parsed.prompt,
          explanation: parsed.explanation ?? null,
          marks: parsed.marks,
          order: parsed.order,
          correctAnswer: parsed.correctAnswer ?? null
        }
      })
    : await prisma.quizQuestion.create({
        data: {
          quizId,
          type: parsed.type as QuizQuestionType,
          prompt: parsed.prompt,
          explanation: parsed.explanation ?? null,
          marks: parsed.marks,
          order: parsed.order,
          correctAnswer: parsed.correctAnswer ?? null
        }
      });

  await prisma.quizOption.deleteMany({ where: { questionId: question.id } });
  if (parsed.type === "MULTIPLE_CHOICE" && parsed.options.length) {
    await prisma.quizOption.createMany({
      data: parsed.options.map((option) => ({
        questionId: question.id,
        label: option.label,
        text: option.text,
        isCorrect: option.isCorrect,
        order: option.order
      }))
    });
  }

  const totalMarks = await prisma.quizQuestion.aggregate({ where: { quizId }, _sum: { marks: true } });
  await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: totalMarks._sum.marks ?? 0 } });

  revalidatePath(`/quizzes/${quizId}/questions`);
  redirect(`/quizzes/${quizId}/questions`);
}

export async function deleteQuizQuestion(quizId: string, questionId: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const question = await prisma.quizQuestion.findFirst({ where: { id: questionId, quiz: { id: quizId, instituteId } } });
    if (!question) {
      return { ok: false, message: "Question was not found." };
    }

    await prisma.quizQuestion.delete({ where: { id: questionId } });
    const totalMarks = await prisma.quizQuestion.aggregate({ where: { quizId }, _sum: { marks: true } });
    await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: totalMarks._sum.marks ?? 0 } });
    revalidatePath(`/quizzes/${quizId}/questions`);
    return { ok: true, message: "Question removed." };
  } catch (error) {
    return actionError(error, "Could not remove question.");
  }
}

export async function markQuizAnswer(quizId: string, attemptId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  const parsed = quizManualMarkSchema.parse(Object.fromEntries(formData));
  const answer = await prisma.quizAnswer.findFirst({
    where: {
      id: parsed.answerId,
      attemptId,
      attempt: { quizId, instituteId }
    },
    include: { question: true }
  });

  if (!answer) {
    throw new Error("Answer was not found.");
  }

  await prisma.quizAnswer.update({
    where: { id: answer.id },
    data: {
      marksAwarded: Math.min(parsed.marksAwarded, Number(answer.question.marks)),
      feedback: parsed.feedback ?? null,
      isCorrect: parsed.marksAwarded >= Number(answer.question.marks)
    }
  });

  const answers = await prisma.quizAnswer.findMany({ where: { attemptId }, select: { marksAwarded: true } });
  const score = answers.reduce((sum, item) => sum + Number(item.marksAwarded), 0);
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { passMark: true } });
  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      manualScore: score,
      passed: score >= Number(quiz?.passMark ?? 0),
      status: "REVIEWED"
    }
  });

  revalidatePath(`/quizzes/${quizId}/attempts/${attemptId}`);
  redirect(`/quizzes/${quizId}/attempts/${attemptId}`);
}

export async function remarkAttempt(attemptId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: true,
      answers: {
        include: {
          selectedOption: true,
          question: true
        }
      }
    }
  });

  if (!attempt) {
    return null;
  }

  let autoScore = 0;
  for (const answer of attempt.answers) {
    const marks = autoMarkQuestion({
      type: answer.question.type,
      marks: Number(answer.question.marks),
      correctAnswer: answer.question.correctAnswer,
      selectedOption: answer.selectedOption,
      answerText: answer.answerText
    });
    autoScore += marks;
    await prisma.quizAnswer.update({
      where: { id: answer.id },
      data: {
        marksAwarded: marks,
        isCorrect: marks >= Number(answer.question.marks)
      }
    });
  }

  await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      autoScore,
      score: autoScore,
      passed: autoScore >= Number(attempt.quiz.passMark),
      status: "AUTO_MARKED"
    }
  });

  return autoScore;
}
