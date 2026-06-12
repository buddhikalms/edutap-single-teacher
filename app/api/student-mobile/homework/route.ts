import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId } = await requireStudentMobileUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        studentId,
        status: status ? (status.toUpperCase() as never) : undefined,
        homework: { status: { in: ["PUBLISHED", "CLOSED"] } }
      },
      include: { homework: { include: { classGroup: true, course: true, attachments: true } } },
      orderBy: { homework: { deadline: "asc" } }
    });

    return NextResponse.json({
      ok: true,
      homework: submissions.map((submission) => ({
        id: submission.homework.id,
        submissionId: submission.id,
        title: submission.homework.title,
        description: submission.homework.description,
        deadline: submission.homework.deadline.toISOString(),
        marks: submission.homework.marks,
        className: submission.homework.classGroup.name,
        courseName: submission.homework.course?.name,
        status: submission.status,
        reviewStatus: submission.reviewStatus,
        marksAwarded: submission.marksAwarded ? Number(submission.marksAwarded) : null,
        feedback: submission.feedback,
        attachments: submission.homework.attachments.map((item) => ({ id: item.id, name: item.name, url: item.url }))
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load homework." }, { status: 500 });
  }
}
