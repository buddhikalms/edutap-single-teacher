import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, BookOpenCheck, CalendarDays, CheckCircle2, MapPin, ShieldCheck, Trophy, Users } from "lucide-react";
import { EnrollmentRequestForm } from "@/components/public/enrollment-request-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicClass, getPublicTeacher } from "@/lib/public-catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const freeLabels: Record<string, string> = { NONE: "No free period", FIRST_WEEK: "First week free", SECOND_WEEK: "Second week free", FIRST_MONTH: "First month free", CUSTOM_DAYS: "Custom free days" };

export default async function ClassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item, teacher] = await Promise.all([getPublicClass(slug), getPublicTeacher()]);
  if (!item || !teacher) notFound();
  const currency = teacher.institute.settings?.currency ?? "LKR";
  const formClasses = [{ id: item.id, name: item.name, gradeId: item.gradeId, grade: item.grade, subject: item.subject, schedule: item.schedule }];

  return (
    <div className="container py-12 sm:py-16">
      <Button asChild variant="ghost" className="-ml-3 mb-6"><Link href="/classes"><ArrowLeft className="h-4 w-4" />All classes</Link></Button>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div>
          <div className="rounded-[2.5rem] bg-primary p-8 text-white sm:p-12">
            <div className="flex flex-wrap gap-2"><Badge variant="secondary">{item.classType.toLowerCase()}</Badge><Badge className="bg-white/10 text-white">{item.availableSeats ? `${item.availableSeats} seats available` : "Waitlist available"}</Badge></div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[.18em] text-teal-200">{item.subject} · {item.grade}</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-6xl">{item.name}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">{item.description}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info icon={CalendarDays} label="Schedule" value={item.schedule} />
            <Info icon={MapPin} label="Location" value={item.location} />
            <Info icon={Users} label="Monthly fee" value={formatCurrency(item.monthlyFee, currency)} />
            <Info icon={ShieldCheck} label="Payment rules" value={`${freeLabels[item.freePeriodType]} · due day ${item.dueDay}`} />
          </div>
          <div className="mt-10">
            <h2 className="text-2xl font-semibold">What students get</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[[CheckCircle2, "Tracked class attendance"], [BellRing, "Parent arrival and class alerts"], [BookOpenCheck, "Homework and learning resources"], [Trophy, "Class quizzes and progress"]].map(([Icon, text]) => <div key={String(text)} className="flex items-center gap-3 rounded-2xl border bg-white p-4"><Icon className="h-5 w-5 text-teal-600" /><span className="font-medium">{String(text)}</span></div>)}
            </div>
          </div>
          <div className="mt-10 rounded-3xl border bg-white p-7">
            <p className="text-sm font-semibold uppercase tracking-[.16em] text-teal-700">Your teacher</p>
            <h2 className="mt-2 text-2xl font-semibold">{teacher.name}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{teacher.bio || `${teacher.name} provides structured teaching, thoughtful feedback, and clear communication for students and families.`}</p>
            <Button asChild variant="outline" className="mt-5"><Link href="/teacher">Meet the teacher</Link></Button>
          </div>
        </div>
        <aside className="h-fit rounded-[2rem] border bg-white p-6 shadow-xl lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-teal-700">Request a place</p>
          <h2 className="mt-1 text-2xl font-semibold">Start with teacher approval</h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">No payment is taken now. The teacher reviews every request before creating student access.</p>
          <EnrollmentRequestForm classes={formClasses} selectedClassId={item.id} compact />
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="rounded-3xl border bg-white p-6"><Icon className="h-5 w-5 text-teal-600" /><p className="mt-4 text-xs uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
