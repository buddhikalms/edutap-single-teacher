export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  instituteId: string;
  branchId?: string | null;
  institute?: { id: string; name: string; logoUrl?: string | null } | null;
  branch?: { id: string; name: string } | null;
};

export type Branch = {
  id: string;
  name: string;
  code: string;
};

export type ClassSummary = {
  id: string;
  name: string;
  code: string;
  schedule: string;
  branchId: string;
  courseName: string;
  subject?: string | null;
  grade?: string | null;
  monthlyFee: number;
  teacherName: string;
  enrolledCount: number;
  activeSession?: AttendanceSession | null;
};

export type AttendanceSession = {
  id: string;
  classGroupId: string;
  sessionDate: string;
  startsAt?: string | null;
  status?: string;
  markedCount: number;
};

export type PaymentSummary = {
  status: "paid" | "pending" | "partial" | "overdue";
  amountDue: number;
  label: string;
};

export type ScanResult = {
  ok: boolean;
  message: string;
  student?: { id: string; name: string; admissionNo: string };
  status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  markedAt?: string;
  payment?: { status: "clear" | "pending" | "overdue" | "partial"; label: string; amountDue: number };
  credential?: { nfcUid?: string; normalizedNfcUid?: string };
};

export type RecentScan = {
  id: string;
  source: string;
  status?: string | null;
  message: string;
  createdAt: string;
  student?: { id: string; name: string; admissionNo: string } | null;
  classGroup?: { id: string; name: string };
};

export type BootstrapResponse = {
  ok: true;
  user: ApiUser;
  branches: Branch[];
  classes: ClassSummary[];
  pendingPayments: { amount: number; count: number };
  recentScans: RecentScan[];
};

export type RosterStudent = {
  id: string;
  admissionNo: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  status: string;
  nfcUid?: string | null;
  attendanceToken?: string | null;
  payment: PaymentSummary;
  attendanceSummary: { present: number; absent: number; late: number; excused: number; total: number };
  todayAttendance?: { status: string; source: string; markedAt: string } | null;
};

export type ClassRosterResponse = {
  ok: true;
  classGroup: {
    id: string;
    name: string;
    code: string;
    schedule: string;
    monthlyFee: number;
    teacher?: { name: string } | null;
    course: { name: string; subject?: string | null; grade?: string | null; fee: string };
  };
  session?: AttendanceSession | null;
  students: RosterStudent[];
};

export type StudentProfileResponse = {
  ok: true;
  student: {
    id: string;
    admissionNo: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    status: string;
    avatarUrl?: string | null;
    nfcUid?: string | null;
    attendanceToken?: string | null;
    branchName: string;
    guardians: Array<{ name: string; phone: string; email?: string | null; occupation?: string | null }>;
    payment: PaymentSummary;
    attendanceSummary: { present: number; absent: number; late: number; excused: number; total: number };
    classes: Array<{ id: string; name: string; code: string; schedule: string; active: boolean; teacherName: string; courseName: string; monthlyFee: number }>;
    attendanceHistory: Array<{ id: string; status: string; source: string; markedAt: string; sessionDate: string; classGroup: { id: string; name: string } }>;
    payments: Array<{ id: string; invoiceNo: string; month?: string | null; type: string; amount: number; paidAmount: number; balance: number; status: string; dueDate: string; paidAt?: string | null }>;
  };
};

export type AssignNfcResponse = {
  ok: true;
  message: string;
  student: { id: string; admissionNo: string; name: string; nfcUid: string };
};
