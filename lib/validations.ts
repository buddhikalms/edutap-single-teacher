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

export const publicTeacherRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(6, "Phone number is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  profilePhotoUrl: optionalText,
  subject: z.string().trim().min(2, "Subject is required."),
  gradesTaught: z.string().trim().min(2, "Grades taught are required."),
  teachingMode: z.enum(["ONLINE", "PHYSICAL", "BOTH"]),
  experience: z.string().trim().min(1, "Experience is required."),
  qualifications: z.string().trim().min(2, "Qualifications are required."),
  bio: z.string().trim().min(20, "Bio must be at least 20 characters."),
  preferredPackage: z.enum(["SINGLE_TEACHER", "INSTITUTE_STARTER", "INSTITUTE_PRO", "ENTERPRISE"]),
  agreement: z.boolean().refine((value) => value, "You must accept the agreement.")
});

export const publicInstituteRegistrationSchema = z.object({
  instituteName: z.string().trim().min(2, "Institute name is required."),
  ownerName: z.string().trim().min(2, "Owner name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(6, "Phone number is required."),
  branchCount: z.coerce.number().int().min(1, "At least one branch is required."),
  studentCount: z.coerce.number().int().min(0, "Student count must be zero or more."),
  preferredPackage: z.enum(["SINGLE_TEACHER", "INSTITUTE_STARTER", "INSTITUTE_PRO", "ENTERPRISE"]),
  password: z.string().min(8, "Password must be at least 8 characters."),
  address: z.string().trim().min(3, "Address is required."),
  logoUrl: optionalText
});

export const studentSelfRegistrationSchema = z.object({
  instituteSlug: z
    .string()
    .trim()
    .min(3, "Workspace slug is required.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  branchId: optionalText,
  branchCode: optionalText,
  admissionNo: optionalText,
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid student email."),
  phone: optionalText,
  dateOfBirth: optionalText,
  password: z.string().min(8, "Password must be at least 8 characters."),
  parentName: z.string().trim().min(1, "Parent or guardian name is required."),
  parentRelationship: z.enum(["Father", "Mother", "Guardian", "Other"]),
  parentEmail: optionalEmail,
  parentPhone: z.string().trim().min(1, "Parent or guardian phone is required."),
  parentNic: optionalText,
  parentAddress: optionalText,
  parentAppLogin: z.string().trim().min(1, "Parent app login mobile or email is required."),
  emergencyContactNumber: z.string().trim().min(1, "Emergency contact number is required."),
  parentOccupation: optionalText
});

export const studentSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: optionalEmail,
  phone: optionalText,
  dateOfBirth: optionalText,
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "REJECTED", "PAUSED", "GRADUATED", "ARCHIVED"]),
  avatarUrl: optionalText,
  cardNumber: optionalText,
  nfcUid: optionalText,
  qrCode: optionalText,
  qrToken: optionalText,
  branchId: z.string().min(1, "Branch is required."),
  parentName: z.string().trim().min(1, "Guardian name is required."),
  parentRelationship: z.enum(["Father", "Mother", "Guardian", "Other"]),
  parentEmail: optionalEmail,
  parentPhone: z.string().trim().min(1, "Guardian phone is required."),
  parentNic: optionalText,
  parentAddress: optionalText,
  parentAppLogin: z.string().trim().min(1, "Parent app login mobile or email is required."),
  emergencyContactNumber: z.string().trim().min(1, "Emergency contact number is required."),
  parentOccupation: optionalText
});

export const cardAssignmentSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  cardNumber: optionalText,
  nfcUid: optionalText,
  qrCode: optionalText,
  qrToken: optionalText,
  notes: optionalText
});

export const cardReplacementSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  reason: z.enum(["LOST", "MISSING", "STOLEN", "DAMAGED", "WRONG_CARD", "OTHER"]),
  cardNumber: optionalText,
  nfcUid: optionalText,
  qrCode: optionalText,
  qrToken: optionalText,
  notes: optionalText,
  createReplacementFee: z.boolean().default(false)
});

export const cardStatusSchema = z.object({
  cardId: z.string().min(1, "Card is required."),
  status: z.enum(["LOST", "MISSING", "STOLEN", "DAMAGED", "BLOCKED", "INACTIVE", "ACTIVE"]),
  reason: optionalText,
  notes: optionalText
});

export const cardDuplicateValidationSchema = z.object({
  cardNumber: optionalText,
  nfcUid: optionalText,
  qrCode: optionalText,
  qrToken: optionalText,
  excludeCardId: optionalText
});

export const teacherSchema = z.object({
  name: z.string().trim().min(1, "Teacher name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: optionalText,
  specialty: optionalText,
  branchId: z.string().min(1, "Branch is required."),
  classGroupIds: z.array(z.string()).optional().default([])
});

export const gradeSchema = z.object({
  name: z.string().trim().min(1, "Grade name is required."),
  order: z.coerce.number().int().min(0, "Order must be zero or more."),
  isActive: z.boolean().default(true)
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required."),
  description: optionalText,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid color."),
  icon: z.string().trim().min(1, "Choose an icon."),
  isActive: z.boolean().default(true)
});

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required."),
  code: z.string().trim().min(1, "Branch code is required."),
  location: optionalText,
  address: optionalText,
  phone: optionalText,
  isActive: z.boolean().default(true)
});

export const courseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required."),
  subjectId: z.string().min(1, "Subject is required."),
  gradeId: optionalText,
  description: optionalText,
  thumbnailUrl: optionalText,
  durationType: z.enum(["DAYS", "WEEKS", "MONTHS", "LIFETIME"]),
  durationValue: z.coerce.number().int().min(1).optional(),
  accessType: z.enum(["FREE", "PAID", "MANUAL_UNLOCK"]),
  fee: z.coerce.number().min(0, "Price must be zero or more."),
  startDate: optionalText,
  endDate: optionalText,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
});

export const classGroupSchema = z.object({
  name: z.string().trim().min(1, "Class name is required."),
  code: z.string().trim().min(1, "Class code is required."),
  schedule: z.string().trim().min(1, "Timetable is required."),
  room: optionalText,
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  branchId: z.string().min(1, "Branch is required."),
  gradeId: z.string().min(1, "Grade is required."),
  subjectId: z.string().min(1, "Subject is required."),
  teacherId: optionalText,
  classType: z.enum(["INHOUSE", "ONLINE", "HYBRID"]),
  fee: z.coerce.number().min(0, "Fee must be zero or more."),
  admissionFee: z.coerce.number().min(0, "Admission fee must be zero or more.").optional(),
  paymentStartDate: optionalText,
  defaultFreePeriodType: z.enum(["NONE", "FIRST_WEEK", "SECOND_WEEK", "FIRST_MONTH", "CUSTOM_DAYS"]),
  defaultFreeDays: z.coerce.number().int().min(0, "Free days must be zero or more.").default(0),
  defaultPaymentDueDay: z.coerce.number().int().min(1, "Due day must be between 1 and 28.").max(28, "Due day must be between 1 and 28."),
  status: z.enum(["ACTIVE", "DISABLED", "ARCHIVED"])
});

export const enrollmentSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  classGroupId: z.string().min(1, "Class is required."),
  active: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "DELETED"]).default("ACTIVE"),
  paymentStartDate: optionalText,
  freePeriodType: z.enum(["NONE", "FIRST_WEEK", "SECOND_WEEK", "FIRST_MONTH", "CUSTOM_DAYS"]).default("NONE"),
  freeDays: z.coerce.number().int().min(0, "Free days must be zero or more.").default(0),
  monthlyFeeOverride: z.coerce.number().min(0, "Monthly fee must be zero or more.").optional(),
  discount: z.coerce.number().min(0, "Discount must be zero or more.").default(0)
});

export const bulkEnrollmentSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student."),
  classGroupId: z.string().min(1, "Class is required."),
  active: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "DELETED"]).default("ACTIVE"),
  paymentStartDate: optionalText,
  freePeriodType: z.enum(["NONE", "FIRST_WEEK", "SECOND_WEEK", "FIRST_MONTH", "CUSTOM_DAYS"]).default("NONE"),
  freeDays: z.coerce.number().int().min(0, "Free days must be zero or more.").default(0),
  monthlyFeeOverride: z.coerce.number().min(0, "Monthly fee must be zero or more.").optional(),
  discount: z.coerce.number().min(0, "Discount must be zero or more.").default(0)
});

export const attendanceSessionSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  sessionDate: z.string().min(1, "Session date is required."),
  sessionType: z.enum(["INHOUSE", "ONLINE", "HYBRID"]).default("INHOUSE"),
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

export const assignStudentNfcSchema = z.object({
  nfcUid: z.string().trim().min(1, "NFC UID is required."),
  writeMode: z.enum(["UID_ONLY", "NDEF_WRITTEN", "NDEF_UNSUPPORTED"]).optional()
});

export const attendanceSearchSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  query: z.string().trim().min(1, "Search value is required."),
  method: z.enum(["MANUAL_ID", "MANUAL_SEARCH"]).default("MANUAL_SEARCH")
});

export const manualIdAttendanceSchema = z.object({
  classGroupId: z.string().min(1, "Class is required."),
  studentId: z.string().min(1, "Student is required."),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]).default("PRESENT"),
  method: z.enum(["MANUAL_ID", "MANUAL_SEARCH"]).default("MANUAL_SEARCH")
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

export const homeworkSchema = z.object({
  title: z.string().trim().min(3, "Homework title is required."),
  description: z.string().trim().min(3, "Description is required."),
  deadline: z.string().min(1, "Deadline is required."),
  marks: z.coerce.number().int().min(0, "Marks must be zero or more."),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  classGroupId: z.string().min(1, "Class is required."),
  courseId: optionalText,
  externalLinks: optionalText,
  attachments: optionalText,
  studentIds: z.array(z.string()).optional().default([])
});

export const homeworkSubmissionReviewSchema = z.object({
  submissionId: z.string().min(1, "Submission is required."),
  marksAwarded: z.coerce.number().min(0, "Marks must be zero or more.").optional(),
  feedback: optionalText,
  reviewStatus: z.enum(["ACCEPTED", "REJECTED", "RESUBMIT"]),
  status: z.enum(["REVIEWED", "SUBMITTED", "LATE"]).default("REVIEWED")
});

export const homeworkSubmitSchema = z.object({
  homeworkId: z.string().min(1, "Homework is required."),
  answerText: optionalText,
  attachmentUrl: optionalText
});

export const quizSchema = z.object({
  title: z.string().trim().min(3, "Quiz title is required."),
  description: optionalText,
  instructions: optionalText,
  startsAt: z.string().min(1, "Start date is required."),
  endsAt: z.string().min(1, "End date is required."),
  timeLimitMins: z.coerce.number().int().min(1, "Time limit is required."),
  totalMarks: z.coerce.number().min(0, "Total marks must be zero or more."),
  passMark: z.coerce.number().min(0, "Pass mark must be zero or more."),
  attemptLimit: z.coerce.number().int().min(1, "Attempt limit must be at least one."),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  classGroupId: z.string().min(1, "Class is required."),
  courseId: optionalText
});

export const quizQuestionSchema = z.object({
  quizId: z.string().min(1, "Quiz is required."),
  questionId: optionalText,
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]),
  prompt: z.string().trim().min(3, "Question prompt is required."),
  explanation: optionalText,
  marks: z.coerce.number().min(0, "Marks must be zero or more."),
  order: z.coerce.number().int().min(0).default(0),
  correctAnswer: optionalText,
  options: z.array(
    z.object({
      id: optionalText,
      label: z.string().trim().min(1),
      text: z.string().trim().min(1),
      isCorrect: z.boolean().default(false),
      order: z.number().int().min(0).default(0)
    })
  ).optional().default([])
});

export const quizAttemptStartSchema = z.object({
  quizId: z.string().min(1, "Quiz is required.")
});

export const quizAnswerSaveSchema = z.object({
  attemptId: z.string().min(1, "Attempt is required."),
  questionId: z.string().min(1, "Question is required."),
  selectedOptionId: optionalText,
  answerText: optionalText
});

export const quizManualMarkSchema = z.object({
  answerId: z.string().min(1, "Answer is required."),
  marksAwarded: z.coerce.number().min(0, "Marks must be zero or more."),
  feedback: optionalText
});

export const liveClassSchema = z.object({
  title: z.string().trim().min(3, "Live class title is required."),
  description: optionalText,
  classGroupId: z.string().min(1, "Class is required."),
  courseId: optionalText,
  teacherId: optionalText,
  meetingProvider: z.enum(["ZOOM_AUTO", "GOOGLE_MEET_AUTO", "EXTERNAL_ZOOM", "EXTERNAL_GOOGLE_MEET", "YOUTUBE_LIVE", "OTHER_LINK"]),
  externalUrl: optionalText,
  startTime: z.string().min(1, "Date and time is required."),
  durationMinutes: z.coerce.number().int().min(5, "Duration must be at least 5 minutes."),
  accessType: z.enum(["FREE", "PAID"]),
  price: z.coerce.number().min(0, "Price must be zero or more.").default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).default("DRAFT"),
  recordingEnabled: z.coerce.boolean().default(false),
  waitingRoom: z.coerce.boolean().default(true),
  passcode: z.coerce.boolean().default(true),
  joinBeforeHost: z.coerce.boolean().default(false),
  muteOnEntry: z.coerce.boolean().default(true),
  recording: z.enum(["none", "local", "cloud"]).default("none"),
  hostVideo: z.coerce.boolean().default(true),
  participantVideo: z.coerce.boolean().default(false),
  alternativeHosts: optionalText,
  recurring: z.coerce.boolean().default(false),
  studentIds: z.array(z.string()).optional().default([])
}).superRefine((value, ctx) => {
  const externalProviders = ["EXTERNAL_ZOOM", "EXTERNAL_GOOGLE_MEET", "YOUTUBE_LIVE", "OTHER_LINK"];
  if (!externalProviders.includes(value.meetingProvider)) return;

  if (!value.externalUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["externalUrl"], message: "Meeting URL is required for external providers." });
    return;
  }

  try {
    const url = new URL(value.externalUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol.");
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["externalUrl"], message: "Enter a valid meeting URL." });
  }
});

export const liveClassRecordingSchema = z.object({
  title: z.string().trim().min(3, "Recording title is required."),
  description: optionalText,
  recordingUrl: z.string().trim().url("Enter a valid recording URL."),
  accessType: z.enum(["FREE", "PAID"]),
  price: z.coerce.number().min(0, "Price must be zero or more.").default(0)
});

export type StudentInput = z.infer<typeof studentSchema>;
export type CardAssignmentInput = z.infer<typeof cardAssignmentSchema>;
export type CardReplacementInput = z.infer<typeof cardReplacementSchema>;
export type CardStatusInput = z.infer<typeof cardStatusSchema>;
export type PublicTeacherRegistrationInput = z.infer<typeof publicTeacherRegistrationSchema>;
export type PublicInstituteRegistrationInput = z.infer<typeof publicInstituteRegistrationSchema>;
export type StudentSelfRegistrationInput = z.infer<typeof studentSelfRegistrationSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ClassGroupInput = z.infer<typeof classGroupSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type BulkEnrollmentInput = z.infer<typeof bulkEnrollmentSchema>;
export type AttendanceSessionInput = z.infer<typeof attendanceSessionSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type QrAttendanceInput = z.infer<typeof qrAttendanceSchema>;
export type NfcAttendanceInput = z.infer<typeof nfcAttendanceSchema>;
export type AssignStudentNfcInput = z.infer<typeof assignStudentNfcSchema>;
export type AttendanceSearchInput = z.infer<typeof attendanceSearchSchema>;
export type ManualIdAttendanceInput = z.infer<typeof manualIdAttendanceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type DuePaymentInput = z.infer<typeof duePaymentSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;
export type HomeworkInput = z.infer<typeof homeworkSchema>;
export type HomeworkSubmissionReviewInput = z.infer<typeof homeworkSubmissionReviewSchema>;
export type HomeworkSubmitInput = z.infer<typeof homeworkSubmitSchema>;
export type QuizInput = z.infer<typeof quizSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type LiveClassInput = z.infer<typeof liveClassSchema>;
export type LiveClassRecordingInput = z.infer<typeof liveClassRecordingSchema>;
