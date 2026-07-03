import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { student, studentId, instituteId } = await requireStudentMobileUser(request);

    const [todayClasses, homework, quizzes, attendance, payments, notifications] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId, active: true },
        include: { classGroup: { include: { subject: true, teacher: true } } },
        take: 5
      }),
      prisma.homeworkSubmission.findMany({
        where: { studentId, status: { in: ["PENDING", "LATE", "MISSING", "SUBMITTED"] }, homework: { status: "PUBLISHED" } },
        include: { homework: { include: { classGroup: true } } },
        orderBy: { homework: { deadline: "asc" } },
        take: 5
      }),
      prisma.quiz.findMany({
        where: {
          instituteId,
          status: "PUBLISHED",
          classGroup: { enrollments: { some: { studentId, active: true } } },
          endsAt: { gte: new Date() }
        },
        include: { attempts: { where: { studentId } }, classGroup: true },
        orderBy: { startsAt: "asc" },
        take: 5
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId },
        select: { status: true },
        take: 200
      }),
      prisma.payment.findMany({
        where: { studentId, status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] } },
        orderBy: { dueDate: "asc" },
        take: 5
      }),
      prisma.notification.findMany({
        where: { instituteId, OR: [{ studentId }, { studentId: null }] },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    const present = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
    const attendancePercentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const pendingPayment = payments.reduce((sum, payment) => sum + Number(payment.balance), 0);

    return NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`
      },
      todayClasses: todayClasses.map((enrollment) => ({
        id: enrollment.classGroup.id,
        name: enrollment.classGroup.name,
        schedule: enrollment.classGroup.schedule,
        courseName: enrollment.classGroup.subject.name,
        teacherName: enrollment.classGroup.teacher?.name ?? "Unassigned"
      })),
      pendingHomework: homework.map((item) => ({
        id: item.homework.id,
        title: item.homework.title,
        deadline: item.homework.deadline.toISOString(),
        status: item.status,
        className: item.homework.classGroup.name
      })),
      upcomingQuizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        startsAt: quiz.startsAt.toISOString(),
        endsAt: quiz.endsAt.toISOString(),
        className: quiz.classGroup.name,
        attempted: quiz.attempts.length > 0
      })),
      attendancePercentage,
      pendingPayment,
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        status: item.status,
        createdAt: item.createdAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load dashboard." }, { status: 500 });
  }
}
