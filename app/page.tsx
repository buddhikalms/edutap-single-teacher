import Link from "next/link";
import {
  ArrowRight, BellRing, BookOpenCheck, CheckCircle2, CreditCard, FileVideo,
  GraduationCap, Nfc, PlayCircle, QrCode, Sparkles, Trophy, UsersRound
} from "lucide-react";
import { PublicShell, SectionHeading } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicClasses, getPublicCourses, getPublicTeacher } from "@/lib/public-catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const features = [
  [Nfc, "NFC attendance", "Fast, accurate arrival tracking."],
  [QrCode, "QR check-in", "A simple fallback for every student."],
  [BellRing, "Parent alerts", "Timely arrival and class updates."],
  [BookOpenCheck, "Homework", "Assignments, uploads, marks, and feedback."],
  [Trophy, "Quizzes", "Practice and progress students can see."],
  [FileVideo, "Recordings", "Learning continues after class ends."],
  [CreditCard, "Payments", "Clear monthly fees, dues, and receipts."],
  [UsersRound, "Student portal", "One mobile-friendly learning home."]
] as const;

export default async function HomePage() {
  const [teacher, classes, courses] = await Promise.all([getPublicTeacher(), getPublicClasses(), getPublicCourses()]);
  if (!teacher) {
    return <PublicShell><div className="container py-32 text-center"><h1 className="text-4xl font-semibold">EduTap is being prepared.</h1><p className="mt-4 text-muted-foreground">Complete teacher setup to publish the learning website.</p></div></PublicShell>;
  }
  if (teacher.status === "INACTIVE") {
    return <PublicShell><div className="container py-32 text-center"><h1 className="text-4xl font-semibold">This teacher portal is currently unavailable.</h1><p className="mt-4 text-muted-foreground">Please contact EduTap support or the institute office for assistance.</p></div></PublicShell>;
  }
  const currency = teacher.institute.settings?.currency ?? "LKR";

  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,.24),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(245,158,11,.18),transparent_28%),linear-gradient(135deg,#f7fffd_0%,#f4f7ff_48%,#fffaf1_100%)]" />
        <div className="container grid min-h-[720px] gap-12 py-20 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-2"><Sparkles className="mr-2 h-4 w-4" /> Learn with clarity. Grow with confidence.</Badge>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight text-primary sm:text-7xl">
              Serious learning, made beautifully simple.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              Join {teacher.name} for focused weekly classes and structured digital courses—with attendance, homework, recordings, quizzes, and parent updates connected in one place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/classes">View classes <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/courses">View courses</Link></Button>
              <Button asChild size="lg" variant="ghost"><Link href="/student/register">Request enrollment</Link></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              {["Teacher-reviewed enrollment", "Mobile-friendly portal", "Clear parent communication"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-600" />{item}</span>)}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-teal-300/35 to-amber-200/45 blur-2xl" />
            <div className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-primary p-3 shadow-[0_35px_100px_-35px_rgba(15,38,56,.55)]">
              {teacher.photoUrl ? <img src={teacher.photoUrl} alt={teacher.name} className="aspect-[4/5] w-full rounded-[1.7rem] object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-teal-500 to-primary text-white"><GraduationCap className="h-32 w-32" /></div>}
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/20 bg-white/90 p-5 shadow-xl backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-teal-700">Your teacher</p>
                <p className="mt-1 text-xl font-semibold">{teacher.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{teacher.specialty || "Private educator"} · {teacher.experience || "Dedicated teaching"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <SectionHeading eyebrow="Weekly classes" title="A class rhythm students can rely on" description="Regular classes are scheduled learning groups with monthly payments, attendance, homework, and direct teacher support." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {classes.slice(0, 3).map((item) => (
            <Link key={item.id} href={`/classes/${item.key}`} className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between"><Badge variant="outline">{item.classType.toLowerCase()}</Badge><span className="text-sm text-muted-foreground">{item.availableSeats} seats left</span></div>
              <p className="mt-5 text-sm font-semibold" style={{ color: item.subjectColor }}>{item.subject} · {item.grade}</p>
              <h3 className="mt-2 text-xl font-semibold">{item.name}</h3>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.schedule}<br />{item.location}</p>
              <div className="mt-6 flex items-center justify-between border-t pt-5"><span className="font-semibold">{formatCurrency(item.monthlyFee, currency)}<small className="font-normal text-muted-foreground"> / month</small></span><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-8"><Link href="/classes">Explore all classes <ArrowRight className="h-4 w-4" /></Link></Button>
      </section>

      <section className="bg-primary py-20 text-white [&_h2]:text-white [&_p]:text-white/70">
        <div className="container">
          <SectionHeading eyebrow="Digital learning" title="Courses that keep teaching beyond the timetable" description="Structured modules, recordings, tutes, papers, resources, and quizzes—separate from regular monthly classes." />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.08] transition hover:bg-white/[.13]">
                {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-teal-500/50 to-amber-400/30"><PlayCircle className="h-14 w-14" /></div>}
                <div className="p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{course.subject}</p><h3 className="mt-2 text-xl font-semibold">{course.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-white/65">{course.description}</p><p className="mt-5 font-semibold">{course.isFree ? "Free access" : formatCurrency(course.price, currency)}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-20">
        <SectionHeading eyebrow="One connected experience" title="Everything around the lesson, thoughtfully handled" align="center" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, description]) => <div key={title} className="rounded-3xl border bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-5 w-5" /></span><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>)}
        </div>
      </section>

      <section className="container pb-20">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-100 via-white to-teal-100 p-8 text-center shadow-sm sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-teal-700">Ready when you are</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold sm:text-5xl">Find the right class, then let the teacher take it from there.</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">Requests are reviewed personally before student access is created.</p>
          <Button asChild size="lg" className="mt-8"><Link href="/student/register">Request enrollment <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
    </PublicShell>
  );
}
