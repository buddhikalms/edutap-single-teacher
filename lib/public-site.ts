import {
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  CreditCard,
  FileVideo,
  GraduationCap,
  Home,
  MessageSquareText,
  Nfc,
  QrCode,
  Radio,
  UsersRound
} from "lucide-react";

export type PublicTeacher = {
  slug: string;
  name: string;
  photo: string;
  subject: string;
  subjects: string[];
  grades: string[];
  mode: "Online" | "Physical" | "Both" | "Hybrid";
  experience: string;
  qualifications: string;
  bio: string;
  rating: number;
};

export type PublicCourse = {
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  teacherSlug: string;
  category: string;
  subject: string;
  grade: string;
  durationType: "Days" | "Weeks" | "Months" | "Lifetime";
  durationValue: number | null;
  startsAt?: string;
  endsAt?: string;
  isFree: boolean;
  price: number;
  accessType: "Full course" | "Module access" | "Recording library";
  status: "Open" | "Upcoming" | "Closed";
  modules: string[];
  resources: string[];
  recordings: string[];
  quizzes: string[];
  homework: string[];
};

export type PublicClass = {
  slug: string;
  name: string;
  branch: string;
  grade: string;
  subject: string;
  teacherSlug: string;
  classType: string;
  schedule: string;
  monthlyFee: number;
  paymentStartDate: string;
  freePeriod: string;
  attendanceEnabled: boolean;
  status: "Open" | "Limited seats" | "Waitlist";
};

export type PublicPlan = {
  id: "SINGLE_TEACHER" | "INSTITUTE_STARTER" | "INSTITUTE_PRO" | "ENTERPRISE";
  name: string;
  summary: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  recommended?: boolean;
  features: string[];
  limitations: string[];
};

export const publicTeachers: PublicTeacher[] = [
  {
    slug: "amaya-perera",
    name: "Amaya Perera",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    subject: "English",
    subjects: ["Spoken English", "IELTS", "Literature"],
    grades: ["Grade 9", "Grade 10", "Grade 11", "Adults"],
    mode: "Both",
    experience: "9 years",
    qualifications: "BA English, CELTA certified trainer",
    bio: "Amaya blends exam technique with confident speaking practice, using recorded feedback and weekly writing clinics for every learner.",
    rating: 4.9
  },
  {
    slug: "dinesh-jayawardena",
    name: "Dinesh Jayawardena",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    subject: "Mathematics",
    subjects: ["Mathematics", "Statistics", "Problem solving"],
    grades: ["Grade 10", "Grade 11", "A/L"],
    mode: "Online",
    experience: "12 years",
    qualifications: "BSc Mathematics, former national school teacher",
    bio: "Dinesh runs high-accountability maths batches with weekly quizzes, revision recordings, and parent progress summaries.",
    rating: 4.8
  },
  {
    slug: "nethmi-ranasinghe",
    name: "Nethmi Ranasinghe",
    photo: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=900&q=80",
    subject: "Early Learning",
    subjects: ["Preschool", "Reading", "Activity learning"],
    grades: ["Preschool", "Grade 1", "Grade 2"],
    mode: "Physical",
    experience: "7 years",
    qualifications: "Diploma in Early Childhood Education",
    bio: "Nethmi designs warm morning classes with attendance updates, homework packs, and parent-friendly communication.",
    rating: 4.9
  },
  {
    slug: "kasun-fernando",
    name: "Kasun Fernando",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
    subject: "Science",
    subjects: ["Science", "Biology", "Revision"],
    grades: ["Grade 8", "Grade 9", "Grade 10", "Grade 11"],
    mode: "Hybrid",
    experience: "10 years",
    qualifications: "BSc Biological Science, PGDE",
    bio: "Kasun turns science theory into visual modules, live experiments, and checkpoint quizzes that make revision easier to track.",
    rating: 4.7
  }
];

export const publicCourses: PublicCourse[] = [
  {
    slug: "spoken-english-six-month-course",
    title: "Spoken English 6 Month Course",
    description: "A structured fluency program with live practice, pronunciation clinics, recordings, and weekly speaking tasks.",
    thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    teacherSlug: "amaya-perera",
    category: "Language",
    subject: "English",
    grade: "Adults",
    durationType: "Months",
    durationValue: 6,
    startsAt: "2026-07-06",
    isFree: false,
    price: 18000,
    accessType: "Full course",
    status: "Open",
    modules: ["Confidence foundations", "Pronunciation repair", "Conversation patterns", "Presentation practice"],
    resources: ["Speaking workbook", "Vocabulary tracker", "Pronunciation drills"],
    recordings: ["Orientation replay", "Sample conversation lab"],
    quizzes: ["Placement quiz", "Monthly fluency checks"],
    homework: ["Weekly voice notes", "Role-play scripts"]
  },
  {
    slug: "ielts-eight-week-course",
    title: "IELTS 8 Week Course",
    description: "Fast-paced IELTS preparation with writing feedback, timed tests, band-score rubrics, and recording access.",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
    teacherSlug: "amaya-perera",
    category: "Exam prep",
    subject: "IELTS",
    grade: "Adults",
    durationType: "Weeks",
    durationValue: 8,
    startsAt: "2026-07-13",
    isFree: false,
    price: 24000,
    accessType: "Recording library",
    status: "Upcoming",
    modules: ["Listening strategy", "Academic reading", "Writing task 1", "Writing task 2", "Speaking simulation"],
    resources: ["Band descriptors", "Practice papers", "Essay templates"],
    recordings: ["Listening walkthrough", "Writing clinic preview"],
    quizzes: ["Reading speed quiz", "Grammar audit"],
    homework: ["Two essays per week", "Speaking mock upload"]
  },
  {
    slug: "grade-10-maths-full-syllabus",
    title: "Grade 10 Maths Full Syllabus",
    description: "Full syllabus coverage with revision modules, exam-style quizzes, and monthly parent progress snapshots.",
    thumbnail: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=80",
    teacherSlug: "dinesh-jayawardena",
    category: "School syllabus",
    subject: "Mathematics",
    grade: "Grade 10",
    durationType: "Months",
    durationValue: 10,
    isFree: false,
    price: 4500,
    accessType: "Module access",
    status: "Open",
    modules: ["Algebra", "Geometry", "Trigonometry", "Statistics", "Past paper revision"],
    resources: ["Formula sheet", "Past paper pack", "Graph paper templates"],
    recordings: ["Algebra basics", "Triangle proofs"],
    quizzes: ["Unit tests", "Term revision quizzes"],
    homework: ["Weekly problem set", "Monthly paper"]
  },
  {
    slug: "science-revision-recordings",
    title: "Science Revision Recordings",
    description: "Lifetime access to concise science revision recordings, diagrams, resources, and topic checks.",
    thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
    teacherSlug: "kasun-fernando",
    category: "Revision",
    subject: "Science",
    grade: "Grade 11",
    durationType: "Lifetime",
    durationValue: null,
    isFree: true,
    price: 0,
    accessType: "Recording library",
    status: "Open",
    modules: ["Biology essentials", "Chemistry equations", "Physics formulas"],
    resources: ["Diagram sheets", "Short notes"],
    recordings: ["Cell biology", "Electricity summary"],
    quizzes: ["Topic checks"],
    homework: ["Optional revision planner"]
  }
];

export const publicClasses: PublicClass[] = [
  {
    slug: "grade-10-english-sunday-8am",
    name: "Grade 10 English Sunday 8 AM",
    branch: "Nugegoda",
    grade: "Grade 10",
    subject: "English",
    teacherSlug: "amaya-perera",
    classType: "Hybrid",
    schedule: "Sunday 08:00-10:00",
    monthlyFee: 3500,
    paymentStartDate: "First paid month after enrollment",
    freePeriod: "First week free",
    attendanceEnabled: true,
    status: "Open"
  },
  {
    slug: "preschool-morning-class",
    name: "Preschool Morning Class",
    branch: "Kottawa",
    grade: "Preschool",
    subject: "Early Learning",
    teacherSlug: "nethmi-ranasinghe",
    classType: "Inhouse",
    schedule: "Monday to Friday 08:30-11:30",
    monthlyFee: 12000,
    paymentStartDate: "Enrollment date",
    freePeriod: "No free period",
    attendanceEnabled: true,
    status: "Limited seats"
  },
  {
    slug: "online-maths-wednesday-7pm",
    name: "Online Maths Wednesday 7 PM",
    branch: "Online",
    grade: "Grade 11",
    subject: "Mathematics",
    teacherSlug: "dinesh-jayawardena",
    classType: "Online",
    schedule: "Wednesday 19:00-21:00",
    monthlyFee: 4000,
    paymentStartDate: "First live session",
    freePeriod: "First class free",
    attendanceEnabled: true,
    status: "Open"
  },
  {
    slug: "science-saturday-revision",
    name: "Science Saturday Revision",
    branch: "Maharagama",
    grade: "Grade 11",
    subject: "Science",
    teacherSlug: "kasun-fernando",
    classType: "Hybrid",
    schedule: "Saturday 15:00-17:30",
    monthlyFee: 3800,
    paymentStartDate: "First paid month after trial",
    freePeriod: "First week free",
    attendanceEnabled: true,
    status: "Open"
  }
];

export const publicPlans: PublicPlan[] = [
  {
    id: "SINGLE_TEACHER",
    name: "Single Teacher EduTap",
    summary: "For one teacher running a polished online or physical learning business.",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ["1 teacher", "Up to 300 students", "10 classes", "5 courses", "NFC, QR, and manual attendance", "Payments", "Homework", "Quizzes", "Student app", "Basic reports"],
    limitations: ["Single teacher workspace", "Standard branding"]
  },
  {
    id: "INSTITUTE_STARTER",
    name: "Institute Starter EduTap",
    summary: "For small institutes that need strong class, teacher, parent, and resource workflows.",
    monthlyPrice: 79,
    yearlyPrice: 790,
    recommended: true,
    features: ["Up to 5 teachers", "1 branch", "Up to 1,000 students", "30 classes", "20 courses", "Parent notifications", "Resources and videos", "Reports"],
    limitations: ["One branch", "Starter automation limits"]
  },
  {
    id: "INSTITUTE_PRO",
    name: "Institute Pro EduTap",
    summary: "For growing institutes that need scale, live learning, recordings, and paid modules.",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: ["Up to 20 teachers", "5 branches", "Up to 5,000 students", "Unlimited classes", "100 courses", "Live classes", "Recordings", "Paid modules", "Advanced reports"],
    limitations: ["Advanced support SLA", "API access add-on"]
  },
  {
    id: "ENTERPRISE",
    name: "EduTap Enterprise",
    summary: "For large education networks that need custom branding, integrations, and dedicated support.",
    monthlyPrice: null,
    yearlyPrice: null,
    features: ["Unlimited teachers", "Unlimited branches", "Unlimited students", "Custom domain", "Custom branding", "API access", "White-label option", "Priority support"],
    limitations: ["Custom implementation scope", "Commercial approval required"]
  }
];

export const publicFeatures = [
  { title: "NFC attendance", description: "Tap-to-mark attendance for busy classroom entrances.", icon: Nfc },
  { title: "QR attendance", description: "Student-friendly QR marking for online and physical sessions.", icon: QrCode },
  { title: "Payments", description: "Monthly fees, dues, receipts, and student ledgers in one place.", icon: CreditCard },
  { title: "Homework", description: "Assignments, attachments, submissions, and review status.", icon: BookOpenCheck },
  { title: "Quizzes", description: "Online assessments with attempts, marks, and feedback.", icon: BrainCircuit },
  { title: "Parent notifications", description: "Attendance and payment updates for families.", icon: MessageSquareText },
  { title: "Live classes", description: "Scheduled online sessions with attendance tracking.", icon: Radio },
  { title: "Recordings", description: "Organized recording libraries linked to courses and classes.", icon: FileVideo }
];

export const heroStats = [
  { label: "Attendance modes", value: "NFC / QR / Manual", icon: QrCode },
  { label: "For institutes", value: "1 to 5,000+ students", icon: Home },
  { label: "Learning formats", value: "Courses + classes", icon: GraduationCap },
  { label: "Operations", value: "Payments + reports", icon: UsersRound }
];

export const upcomingLiveSchedule = [
  { title: "IELTS Speaking Simulation", teacherSlug: "amaya-perera", time: "Mon 7:30 PM", courseSlug: "ielts-eight-week-course" },
  { title: "Grade 11 Maths Paper Review", teacherSlug: "dinesh-jayawardena", time: "Wed 7:00 PM", courseSlug: "grade-10-maths-full-syllabus" },
  { title: "Science Diagrams Clinic", teacherSlug: "kasun-fernando", time: "Sat 5:30 PM", courseSlug: "science-revision-recordings" }
];

export function getTeacher(slug: string) {
  return publicTeachers.find((teacher) => teacher.slug === slug);
}

export function getCourse(slug: string) {
  return publicCourses.find((course) => course.slug === slug);
}

export function teacherName(slug: string) {
  return getTeacher(slug)?.name ?? "EduTap teacher";
}

export function courseDuration(course: PublicCourse) {
  if (course.durationType === "Lifetime") {
    return "Lifetime access";
  }

  return `${course.durationValue} ${course.durationType.toLowerCase()}`;
}

export function uniqueValues<T>(items: T[], mapper: (item: T) => string | string[]) {
  const values = items.flatMap((item) => mapper(item)).filter(Boolean);
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function searchText(...parts: Array<string | number | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}
