import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(3, "Enter your email or mobile number."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const registerInstituteSchema = z.object({
  instituteName: z.string().min(2, "Institute name is required."),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  email: z.string().email("Enter a valid institute email."),
  phone: z.string().min(6, "Phone number is required."),
  address: z.string().optional(),
  adminName: z.string().min(2, "Admin name is required."),
  adminEmail: z.string().email("Enter a valid admin email."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInstituteInput = z.infer<typeof registerInstituteSchema>;

const optionalText = z.string().trim().optional().transform((value) => (value ? value : undefined));
const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.string().email("Enter a valid email.").optional());

export const studentSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: optionalEmail,
  phone: optionalText,
  dateOfBirth: optionalText,
  status: z.enum(["ACTIVE", "PAUSED", "GRADUATED", "ARCHIVED"]),
  avatarUrl: optionalText,
  nfcUid: optionalText,
  qrCode: optionalText,
  branchId: z.string().min(1, "Branch is required."),
  parentName: z.string().trim().min(1, "Guardian name is required."),
  parentEmail: optionalEmail,
  parentPhone: z.string().trim().min(1, "Guardian phone is required."),
  parentOccupation: optionalText
});

export const teacherSchema = z.object({
  name: z.string().trim().min(1, "Teacher name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: optionalText,
  specialty: optionalText,
  branchId: z.string().min(1, "Branch is required."),
  classGroupIds: z.array(z.string()).optional().default([])
});

export const courseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required."),
  code: z.string().trim().min(1, "Course code is required."),
  subject: optionalText,
  grade: optionalText,
  description: optionalText,
  fee: z.coerce.number().min(0, "Fee must be zero or more.")
});

export const classGroupSchema = z.object({
  name: z.string().trim().min(1, "Class name is required."),
  code: z.string().trim().min(1, "Class code is required."),
  schedule: z.string().trim().min(1, "Timetable is required."),
  room: optionalText,
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  branchId: z.string().min(1, "Branch is required."),
  courseId: z.string().min(1, "Course is required."),
  teacherId: optionalText
});

export const enrollmentSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  classGroupId: z.string().min(1, "Class is required."),
  active: z.boolean().default(true)
});

export const bulkEnrollmentSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student."),
  classGroupId: z.string().min(1, "Class is required."),
  active: z.boolean().default(true)
});

export const attendanceSessionSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  sessionDate: z.string().min(1, "Session date is required."),
  notes: optionalText
});

export const attendanceRecordInputSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: optionalText
});

export const manualAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session is required."),
  records: z.array(attendanceRecordInputSchema).min(1, "At least one record is required.")
});

export const qrAttendanceSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  token: z.string().trim().min(8, "QR token is required."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]).default("PRESENT")
});

export const nfcAttendanceSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  nfcUid: z.string().trim().min(1, "NFC UID is required."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]).default("PRESENT")
});

export const attendanceReportSchema = z.object({
  classGroupId: optionalText,
  studentId: optionalText,
  date: optionalText
});

export const paymentSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  classGroupId: optionalText,
  month: z.string().regex(/^\d{4}-\d{2}$/, "Select a billing month."),
  type: z.enum(["MONTHLY_FEE", "ADMISSION_FEE", "EXAM_FEE", "OTHER"]),
  amount: z.coerce.number().min(0, "Amount must be zero or more."),
  discount: z.coerce.number().min(0, "Discount must be zero or more.").default(0),
  paidAmount: z.coerce.number().min(0, "Paid amount must be zero or more.").default(0),
  dueDate: z.string().min(1, "Due date is required."),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE"]).optional(),
  note: optionalText,
  receivedBy: optionalText
});

export const duePaymentSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Select a billing month."),
  studentId: z.string().min(1, "Student is required."),
  paidAmount: z.coerce.number().min(0, "Paid amount must be zero or more."),
  discount: z.coerce.number().min(0, "Discount must be zero or more.").default(0),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "ONLINE"]),
  note: optionalText,
  receivedBy: optionalText
});

export const paymentReportSchema = z.object({
  date: optionalText,
  month: optionalText,
  classGroupId: optionalText,
  studentId: optionalText
});

export const noticeSchema = z.object({
  title: z.string().trim().min(3, "Notice title is required."),
  body: z.string().trim().min(8, "Notice message is required."),
  audience: z.enum(["INSTITUTE", "CLASS", "STUDENTS"]),
  type: z.enum(["NOTICE", "PAYMENT_DUE", "ABSENT_ALERT", "CLASS_NOTICE", "RECEIPT"]).default("NOTICE"),
  channel: z.enum(["IN_APP", "PUSH", "SMS", "WHATSAPP", "EMAIL"]).default("IN_APP"),
  classGroupId: optionalText,
  studentIds: z.array(z.string()).optional().default([])
});

export type StudentInput = z.infer<typeof studentSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ClassGroupInput = z.infer<typeof classGroupSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type BulkEnrollmentInput = z.infer<typeof bulkEnrollmentSchema>;
export type AttendanceSessionInput = z.infer<typeof attendanceSessionSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type QrAttendanceInput = z.infer<typeof qrAttendanceSchema>;
export type NfcAttendanceInput = z.infer<typeof nfcAttendanceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type DuePaymentInput = z.infer<typeof duePaymentSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;
