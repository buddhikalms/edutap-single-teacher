import { StudentsTable, type StudentRow } from "@/components/students/students-table";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function StudentsPage() {
  const { instituteId } = await getTenantContext();

  const [students, branches, settings] = await Promise.all([
    prisma.student.findMany({
      where: { instituteId },
      include: {
        branch: true,
        parents: { take: 1 },
        payments: true,
        attendance: true,
        cards: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { issuedAt: "desc" }
        },
        enrollments: {
          include: {
            classGroup: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.instituteSettings.findUnique({
      where: { instituteId },
      select: { currency: true }
    })
  ]);

  const rows: StudentRow[] = students.map((student) => ({
    id: student.id,
    admissionNo: student.admissionNo,
    firstName: student.firstName,
    lastName: student.lastName,
    name: `${student.firstName} ${student.lastName}`,
    email: student.email,
    phone: student.phone,
    status: student.status,
    avatarUrl: student.avatarUrl,
    cardNumber: student.cards[0]?.cardNumber ?? null,
    nfcUid: student.nfcUid,
    qrCode: student.qrCode,
    qrToken: student.cards[0]?.qrToken ?? student.attendanceToken,
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : "",
    branchId: student.branchId,
    branch: student.branch.name,
    classes: student.enrollments.map((enrollment) => enrollment.classGroup.name).join(", ") || "Not enrolled",
    parentName: student.parents[0]?.name ?? "",
    parentRelationship: (student.parents[0]?.relationship as StudentRow["parentRelationship"] | null) ?? "Guardian",
    parentEmail: student.parents[0]?.email ?? null,
    parentPhone: student.parents[0]?.phone ?? "",
    parentNic: student.parents[0]?.nic ?? null,
    parentAddress: student.parents[0]?.address ?? null,
    parentAppLogin: student.parents[0]?.appLoginIdentifier ?? student.parents[0]?.email ?? student.parents[0]?.phone ?? "",
    emergencyContactNumber: student.parents[0]?.emergencyContactNumber ?? student.parents[0]?.phone ?? "",
    parentOccupation: student.parents[0]?.occupation ?? null,
    pendingAmount: student.payments
      .filter((payment) => payment.status !== "PAID" && payment.status !== "CANCELLED")
      .reduce((total, payment) => total + Number(payment.amount), 0),
    paidAmount: student.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((total, payment) => total + Number(payment.amount), 0),
    attendanceRate:
      student.attendance.length === 0
        ? 0
        : Math.round((student.attendance.filter((record) => record.status === "PRESENT").length / student.attendance.length) * 100)
  }));

  return <StudentsTable data={rows} branches={branches} currency={settings?.currency ?? "USD"} />;
}
