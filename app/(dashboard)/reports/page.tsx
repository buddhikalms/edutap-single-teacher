import { AttendanceStatus, PaymentStatus } from "@prisma/client";
import { BarChart3, CalendarCheck2, CreditCard, UsersRound } from "lucide-react";
import { CsvExportButton } from "@/components/payments/csv-export-button";
import { AttendanceReportChart, ClassLoadChart, PaymentTrendChart } from "@/components/reports/report-charts";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportMetricCard } from "@/components/reports/report-metric-card";
import { ReportTable } from "@/components/reports/report-table";
import { Badge } from "@/components/ui/badge";
import { csvEscape } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOfParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function csvSection(title: string, headers: string[], rows: unknown[][]) {
  return [
    title,
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
    ""
  ].join("\n");
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const { instituteId } = await getTenantContext();

  const from = valueOfParam(params, "from");
  const to = valueOfParam(params, "to");
  const classGroupId = valueOfParam(params, "classGroupId");
  const studentId = valueOfParam(params, "studentId");
  const startDate = parseDate(from);
  const endDate = parseDate(to, true);
  const dateRange = startDate || endDate ? { gte: startDate, lte: endDate } : undefined;

  const [classes, students] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.student.findMany({
      where: { instituteId },
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    })
  ]);

  const [attendanceRecords, payments, studentRows, teacherRows, classRows] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        studentId: studentId || undefined,
        session: {
          sessionDate: dateRange,
          classGroup: {
            instituteId,
            id: classGroupId || undefined
          }
        }
      },
      include: {
        student: true,
        session: {
          include: {
            classGroup: true
          }
        }
      },
      orderBy: { markedAt: "desc" },
      take: 250
    }),
    prisma.payment.findMany({
      where: {
        instituteId,
        studentId: studentId || undefined,
        classGroupId: classGroupId || undefined,
        createdAt: dateRange
      },
      include: {
        student: true,
        classGroup: true
      },
      orderBy: { createdAt: "desc" },
      take: 250
    }),
    prisma.student.findMany({
      where: {
        instituteId,
        id: studentId || undefined,
        createdAt: dateRange,
        enrollments: classGroupId ? { some: { classGroupId } } : undefined
      },
      include: {
        branch: true,
        enrollments: {
          include: { classGroup: true },
          where: classGroupId ? { classGroupId } : undefined
        },
        _count: {
          select: {
            attendance: true,
            payments: true
          }
        }
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 250
    }),
    prisma.teacher.findMany({
      where: {
        instituteId,
        createdAt: dateRange,
        classGroups: classGroupId ? { some: { id: classGroupId } } : undefined
      },
      include: {
        branch: true,
        classGroups: {
          include: { course: true },
          where: classGroupId ? { id: classGroupId } : undefined
        }
      },
      orderBy: { name: "asc" },
      take: 250
    }),
    prisma.classGroup.findMany({
      where: {
        instituteId,
        id: classGroupId || undefined,
        enrollments: studentId ? { some: { studentId } } : undefined,
        createdAt: dateRange
      },
      include: {
        branch: true,
        course: true,
        teacher: true,
        _count: {
          select: {
            enrollments: true,
            attendanceSessions: true,
            payments: true
          }
        }
      },
      orderBy: { name: "asc" },
      take: 250
    })
  ]);

  const attendanceTotals = Object.values(AttendanceStatus).map((status) => ({
    status,
    value: attendanceRecords.filter((record) => record.status === status).length
  }));
  const presentCount = attendanceTotals.find((item) => item.status === AttendanceStatus.PRESENT)?.value ?? 0;
  const attendanceRate = attendanceRecords.length ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

  const paidTotal = payments.reduce((total, payment) => total + Number(payment.paidAmount), 0);
  const duePayments = payments.filter((payment) => Number(payment.balance) > 0 && payment.status !== PaymentStatus.PAID);
  const dueTotal = duePayments.reduce((total, payment) => total + Number(payment.balance), 0);

  const trendMap = new Map<string, { label: string; paid: number; due: number }>();
  for (const payment of payments) {
    const label =
      payment.month ??
      payment.createdAt.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit"
      });
    const current = trendMap.get(label) ?? { label, paid: 0, due: 0 };
    current.paid += Number(payment.paidAmount);
    current.due += Number(payment.balance);
    trendMap.set(label, current);
  }
  const paymentTrend = Array.from(trendMap.values()).slice(-8);

  const studentReport = studentRows.map((student) => ({
    name: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo,
    branch: student.branch.name,
    status: student.status,
    classes: student.enrollments.map((item) => item.classGroup.name).join(", ") || "-",
    attendance: student._count.attendance,
    payments: student._count.payments
  }));

  const teacherReport = teacherRows.map((teacher) => ({
    name: teacher.name,
    email: teacher.email,
    branch: teacher.branch.name,
    specialty: teacher.specialty ?? "-",
    classes: teacher.classGroups.map((item) => item.name).join(", ") || "-",
    classCount: teacher.classGroups.length
  }));

  const classReport = classRows.map((classGroup) => ({
    name: classGroup.name,
    code: classGroup.code,
    course: classGroup.course.name,
    teacher: classGroup.teacher?.name ?? "Unassigned",
    branch: classGroup.branch.name,
    students: classGroup._count.enrollments,
    capacity: classGroup.capacity,
    sessions: classGroup._count.attendanceSessions,
    payments: classGroup._count.payments
  }));

  const csv = [
    csvSection(
      "Attendance Report",
      ["Date", "Student", "Admission", "Class", "Status", "Source", "Marked At"],
      attendanceRecords.map((record) => [
        formatDate(record.session.sessionDate),
        `${record.student.firstName} ${record.student.lastName}`,
        record.student.admissionNo,
        record.session.classGroup.name,
        record.status,
        record.source,
        record.markedAt.toISOString()
      ])
    ),
    csvSection(
      "Payment Report",
      ["Invoice", "Student", "Class", "Amount", "Paid", "Balance", "Status", "Due Date"],
      payments.map((payment) => [
        payment.invoiceNo,
        `${payment.student.firstName} ${payment.student.lastName}`,
        payment.classGroup?.name ?? "General",
        payment.amount,
        payment.paidAmount,
        payment.balance,
        payment.status,
        formatDate(payment.dueDate)
      ])
    ),
    csvSection(
      "Student Report",
      ["Admission", "Student", "Branch", "Status", "Classes", "Attendance Records", "Payments"],
      studentReport.map((student) => [student.admissionNo, student.name, student.branch, student.status, student.classes, student.attendance, student.payments])
    ),
    csvSection(
      "Teacher Report",
      ["Teacher", "Email", "Branch", "Specialty", "Classes"],
      teacherReport.map((teacher) => [teacher.name, teacher.email, teacher.branch, teacher.specialty, teacher.classes])
    ),
    csvSection(
      "Class Report",
      ["Class", "Code", "Course", "Teacher", "Branch", "Students", "Capacity", "Sessions", "Payments"],
      classReport.map((classGroup) => [
        classGroup.name,
        classGroup.code,
        classGroup.course,
        classGroup.teacher,
        classGroup.branch,
        classGroup.students,
        classGroup.capacity,
        classGroup.sessions,
        classGroup.payments
      ])
    )
  ].join("\n");

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Advanced reports</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Institution intelligence center</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Server-filtered attendance, payments, dues, students, teachers, and classes with export-ready operational detail.
            </p>
          </div>
          <CsvExportButton filename="classcard-advanced-reports.csv" csv={csv} />
        </div>
      </section>

      <ReportFilters
        classes={classes}
        students={students.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo
        }))}
        values={{ from, to, classGroupId, studentId }}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard title="Attendance rate" value={`${attendanceRate}%`} helper={`${presentCount} present from ${attendanceRecords.length} records`} icon={CalendarCheck2} />
        <ReportMetricCard title="Collected" value={formatCurrency(paidTotal)} helper={`${payments.length} payment records in this view`} icon={CreditCard} />
        <ReportMetricCard title="Due payments" value={formatCurrency(dueTotal)} helper={`${duePayments.length} invoices with remaining balances`} icon={BarChart3} />
        <ReportMetricCard title="Students covered" value={String(studentReport.length)} helper={`${teacherReport.length} teachers and ${classReport.length} classes matched`} icon={UsersRound} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <AttendanceReportChart data={attendanceTotals} />
        <PaymentTrendChart data={paymentTrend} />
      </section>

      <ClassLoadChart data={classReport.map((item) => ({ name: item.name, students: item.students, capacity: item.capacity }))} />

      <ReportTable
        title="Attendance report"
        rows={attendanceRecords}
        columns={[
          { key: "date", label: "Date", render: (row) => formatDate(row.session.sessionDate) },
          { key: "student", label: "Student", render: (row) => `${row.student.firstName} ${row.student.lastName}` },
          { key: "class", label: "Class", render: (row) => row.session.classGroup.name },
          { key: "status", label: "Status", render: (row) => row.status },
          { key: "source", label: "Source", render: (row) => row.source }
        ]}
      />

      <ReportTable
        title="Payment report"
        rows={payments}
        columns={[
          { key: "invoice", label: "Invoice", render: (row) => row.invoiceNo },
          { key: "student", label: "Student", render: (row) => `${row.student.firstName} ${row.student.lastName}` },
          { key: "class", label: "Class", render: (row) => row.classGroup?.name ?? "General" },
          { key: "paid", label: "Paid", align: "right", render: (row) => formatCurrency(row.paidAmount.toString()) },
          { key: "balance", label: "Balance", align: "right", render: (row) => formatCurrency(row.balance.toString()) },
          { key: "status", label: "Status", render: (row) => row.status }
        ]}
      />

      <ReportTable
        title="Due payment report"
        rows={duePayments}
        columns={[
          { key: "invoice", label: "Invoice", render: (row) => row.invoiceNo },
          { key: "student", label: "Student", render: (row) => `${row.student.firstName} ${row.student.lastName}` },
          { key: "class", label: "Class", render: (row) => row.classGroup?.name ?? "General" },
          { key: "dueDate", label: "Due date", render: (row) => formatDate(row.dueDate) },
          { key: "balance", label: "Balance", align: "right", render: (row) => formatCurrency(row.balance.toString()) },
          { key: "status", label: "Status", render: (row) => row.status }
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ReportTable
          title="Student report"
          rows={studentReport}
          columns={[
            { key: "admission", label: "Admission", render: (row) => row.admissionNo },
            { key: "student", label: "Student", render: (row) => row.name },
            { key: "branch", label: "Branch", render: (row) => row.branch },
            { key: "classes", label: "Classes", render: (row) => row.classes },
            { key: "status", label: "Status", render: (row) => row.status }
          ]}
        />

        <ReportTable
          title="Teacher report"
          rows={teacherReport}
          columns={[
            { key: "teacher", label: "Teacher", render: (row) => row.name },
            { key: "email", label: "Email", render: (row) => row.email },
            { key: "branch", label: "Branch", render: (row) => row.branch },
            { key: "classes", label: "Classes", render: (row) => row.classes },
            { key: "count", label: "Load", align: "right", render: (row) => row.classCount }
          ]}
        />
      </section>

      <ReportTable
        title="Class report"
        rows={classReport}
        columns={[
          { key: "class", label: "Class", render: (row) => row.name },
          { key: "course", label: "Course", render: (row) => row.course },
          { key: "teacher", label: "Teacher", render: (row) => row.teacher },
          { key: "branch", label: "Branch", render: (row) => row.branch },
          { key: "students", label: "Students", align: "right", render: (row) => `${row.students}/${row.capacity}` },
          { key: "sessions", label: "Sessions", align: "right", render: (row) => row.sessions }
        ]}
      />
    </div>
  );
}
