export type ApiOk<T> = T & { ok: true };

export type StudentSession = {
  token: string;
  apiUrl: string;
  student: {
    id: string;
    admissionNo: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
};

export type DashboardResponse = ApiOk<{
  student: { id: string; admissionNo: string; name: string };
  todayClasses: Array<{ id: string; name: string; schedule: string; courseName: string; teacherName: string }>;
  pendingHomework: Array<{ id: string; title: string; deadline: string; status: string; className: string }>;
  upcomingQuizzes: Array<{ id: string; title: string; startsAt: string; endsAt: string; className: string; attempted: boolean }>;
  attendancePercentage: number;
  pendingPayment: number;
  notifications: Array<{ id: string; title: string; message: string; type: string; status: string; createdAt: string }>;
}>;

export type HomeworkItem = {
  id: string;
  submissionId: string;
  title: string;
  description: string;
  deadline: string;
  marks: number;
  className: string;
  courseName?: string;
  status: string;
  marksAwarded?: number | null;
  feedback?: string | null;
};

export type LiveClassItem = {
  id: string;
  title: string;
  description?: string | null;
  provider: string;
  meetingProvider: string;
  providerLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  className: string;
  courseName: string;
  teacherName: string;
  accessType: "FREE" | "PAID";
  price: number;
  locked: boolean;
  runtime: "live" | "upcoming" | "completed" | "cancelled" | "draft";
  joined: boolean;
  attendance?: {
    joinedAt: string;
    leftAt?: string | null;
    durationWatched?: number | null;
    status: string;
  } | null;
  recordings: Array<{
    id: string;
    title: string;
    description?: string | null;
    recordingUrl?: string | null;
    accessType: "FREE" | "PAID";
    price: number;
    locked: boolean;
  }>;
};

export type LiveClassesResponse = ApiOk<{
  liveNow: LiveClassItem[];
  upcoming: LiveClassItem[];
  completed: LiveClassItem[];
  joinHistory: LiveClassItem[];
}>;

export type QuizItem = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  timeLimitMins: number;
  totalMarks: number;
  passMark: number;
  className: string;
  availability: string;
  latestAttempt?: { id: string; status: string; score: number; passed: boolean } | null;
};

export type StudentProfile = {
  id: string;
  admissionNo?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  qrCode?: string | null;
  branch?: { id: string; name: string } | null;
  institute?: { id: string; name: string; logoUrl?: string | null } | null;
  parents: Array<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    occupation?: string | null;
  }>;
};

export type ProfileResponse = ApiOk<{
  student: StudentProfile;
}>;
