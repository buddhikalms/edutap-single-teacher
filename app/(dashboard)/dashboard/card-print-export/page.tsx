import { redirect } from "next/navigation";
import { CardPrintExportWizard } from "@/components/cards/card-print-export-wizard";
import { canManageCardPrintExport } from "@/lib/card-print-export";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function CardPrintExportPage() {
  const { instituteId, role } = await getTenantContext();
  if (!canManageCardPrintExport(role)) {
    redirect("/dashboard");
  }

  const [institute, grades, subjects, classGroups, students, batches] = await Promise.all([
    prisma.institute.findUnique({ where: { id: instituteId }, select: { name: true } }),
    prisma.grade.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({
      where: { instituteId, status: "ACTIVE" },
      include: {
        parents: { take: 1 },
        cards: { orderBy: { issuedAt: "desc" }, take: 1 },
        enrollments: {
          where: { active: true },
          include: { classGroup: { include: { gradeLevel: true, subject: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.cardPrintBatch.findMany({
      where: { instituteId },
      select: { id: true, batchNumber: true, title: true, status: true, studentCount: true, exportedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <CardPrintExportWizard
      instituteName={institute?.name ?? "EduTap"}
      grades={grades}
      subjects={subjects}
      classes={classGroups}
      batches={batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        title: batch.title,
        status: batch.status,
        studentCount: batch.studentCount,
        exportedAt: batch.exportedAt?.toISOString() ?? null,
        createdAt: batch.createdAt.toISOString()
      }))}
      students={students.map((student) => {
        const parent = student.parents[0];
        const card = student.cards[0];
        const classItems = student.enrollments.map((enrollment) => enrollment.classGroup);
        return {
          id: student.id,
          admissionNo: student.admissionNo,
          name: `${student.firstName} ${student.lastName}`.trim(),
          phone: student.phone ?? "",
          avatarUrl: student.avatarUrl,
          parentMobile: parent?.phone ?? "",
          emergencyContact: parent?.emergencyContactNumber ?? parent?.phone ?? "",
          gradeIds: Array.from(new Set(classItems.map((item) => item.gradeId).filter(Boolean) as string[])),
          gradeNames: Array.from(new Set(classItems.map((item) => item.gradeLevel?.name).filter(Boolean) as string[])),
          subjectIds: Array.from(new Set(classItems.map((item) => item.subjectId).filter(Boolean))),
          subjectNames: Array.from(new Set(classItems.map((item) => item.subject?.name).filter(Boolean) as string[])),
          classIds: classItems.map((item) => item.id),
          classNames: classItems.map((item) => item.name),
          createdAt: student.createdAt.toISOString(),
          cardStatus: card?.status ?? null,
          cardNumber: card?.cardNumber ?? null,
          qrToken: card?.qrToken ?? student.attendanceToken ?? null,
          isReissueCandidate: Boolean(card && ["LOST", "MISSING", "STOLEN", "DAMAGED", "REPLACED"].includes(card.status))
        };
      })}
    />
  );
}
