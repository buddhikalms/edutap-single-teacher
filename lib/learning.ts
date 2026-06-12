import { QuizQuestionType, QuizStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function parseDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return date;
}

export function splitLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function classScopeForRole(user: { userId: string; role: string; branchId?: string | null }) {
  if (user.role === "TEACHER") {
    return { teacher: { userId: user.userId } };
  }

  if ((user.role === "BRANCH_ADMIN" || user.role === "STAFF") && user.branchId) {
    return { branchId: user.branchId };
  }

  return {};
}

export async function assertCanManageClass(input: {
  instituteId: string;
  classGroupId: string;
  userId: string;
  role: string;
  branchId?: string | null;
}) {
  const classGroup = await prisma.classGroup.findFirst({
    where: {
      id: input.classGroupId,
      instituteId: input.instituteId
    },
    include: {
      course: { select: { id: true } },
      teacher: { select: { userId: true } }
    }
  });

  if (!classGroup) {
    throw new Error("Class was not found.");
  }

  if (input.role === "TEACHER" && classGroup.teacher?.userId !== input.userId) {
    throw new Error("Teachers can only manage assigned classes.");
  }

  if ((input.role === "BRANCH_ADMIN" || input.role === "STAFF") && input.branchId && classGroup.branchId !== input.branchId) {
    throw new Error("You do not have access to this branch.");
  }

  return classGroup;
}

export function homeworkSubmissionStatus(deadline: Date, submittedAt: Date | null | undefined) {
  if (submittedAt) {
    return submittedAt > deadline ? "LATE" : "SUBMITTED";
  }

  return new Date() > deadline ? "MISSING" : "PENDING";
}

export function quizAvailability(quiz: { status: QuizStatus; startsAt: Date; endsAt: Date }) {
  const now = new Date();

  if (quiz.status !== "PUBLISHED") {
    return "draft";
  }

  if (now < quiz.startsAt) {
    return "upcoming";
  }

  if (now > quiz.endsAt) {
    return "completed";
  }

  return "live";
}

export function autoMarkQuestion(input: {
  type: QuizQuestionType;
  marks: number;
  correctAnswer?: string | null;
  selectedOption?: { isCorrect: boolean } | null;
  answerText?: string | null;
}) {
  if (input.type === "MULTIPLE_CHOICE") {
    return input.selectedOption?.isCorrect ? input.marks : 0;
  }

  if (input.type === "TRUE_FALSE") {
    return input.correctAnswer?.trim().toLowerCase() === input.answerText?.trim().toLowerCase() ? input.marks : 0;
  }

  return 0;
}
