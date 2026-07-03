import { NextResponse } from "next/server";
import { homeworkSubmitSchema } from "@/lib/validations";
import { homeworkSubmissionStatus } from "@/lib/learning";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";
import { sendStudentWebPush } from "@/lib/web-push";

type RouteContext = { params: Promise<{ homeworkId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { homeworkId } = await context.params;
    const { studentId } = await requireStudentMobileUser(request);
    const submission = await prisma.homeworkSubmission.findFirst({
      where: { homeworkId, studentId },
      include: { homework: { include: { classGroup: true, subject: true, attachments: true } } }
    });

    if (!submission) return NextResponse.json({ ok: false, message: "Homework was not found." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      homework: {
        id: submission.homework.id,
        title: submission.homework.title,
        description: submission.homework.description,
        deadline: submission.homework.deadline.toISOString(),
        marks: submission.homework.marks,
        className: submission.homework.classGroup.name,
        courseName: submission.homework.subject?.name,
        externalLinks: submission.homework.externalLinks,
        attachments: submission.homework.attachments,
        submission: {
          id: submission.id,
          status: submission.status,
          answerText: submission.answerText,
          attachmentUrl: submission.attachmentUrl,
          marksAwarded: submission.marksAwarded ? Number(submission.marksAwarded) : null,
          feedback: submission.feedback,
          reviewStatus: submission.reviewStatus,
          submittedAt: submission.submittedAt?.toISOString() ?? null
        }
      }
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load homework detail." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { homeworkId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const parsed = homeworkSubmitSchema.parse({ ...(await request.json()), homeworkId });
    const submission = await prisma.homeworkSubmission.findFirst({
      where: { homeworkId: parsed.homeworkId, studentId },
      include: { homework: true }
    });

    if (!submission || submission.homework.status !== "PUBLISHED") {
      return NextResponse.json({ ok: false, message: "Homework is not available for submission." }, { status: 404 });
    }

    const now = new Date();
    const saved = await prisma.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        answerText: parsed.answerText ?? null,
        attachmentUrl: parsed.attachmentUrl ?? null,
        submittedAt: now,
        status: homeworkSubmissionStatus(submission.homework.deadline, now),
        reviewStatus: null
      }
    });

    const notification = await prisma.notification.create({
      data: {
        instituteId,
        studentId,
        title: "Homework submitted",
        message: `Your submission for ${submission.homework.title} was received.`,
        type: "NOTICE",
        actionUrl: `/student/homework/${submission.homework.id}`
      }
    });

    await sendStudentWebPush({
      instituteId,
      studentId,
      notificationId: notification.id,
      type: "NOTICE",
      title: "Homework submitted",
      body: `Your submission for ${submission.homework.title} was received.`,
      data: { actionUrl: `/student/homework/${submission.homework.id}`, homeworkId: submission.homework.id }
    }).catch((error) => console.error("Student homework web push failed", error));

    return NextResponse.json({ ok: true, message: "Homework submitted.", submissionId: saved.id, status: saved.status });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not submit homework." }, { status: 500 });
  }
}
