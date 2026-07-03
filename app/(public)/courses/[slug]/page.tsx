import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicCourse, getPublicTeacher } from "@/lib/public-catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, teacher] = await Promise.all([getPublicCourse(slug), getPublicTeacher()]);
  if (!course) notFound();
  const currency = teacher?.institute.settings?.currency ?? "LKR";
  return <div className="container py-12 sm:py-16">
    <Button asChild variant="ghost" className="-ml-3 mb-6"><Link href="/courses"><ArrowLeft className="h-4 w-4" />All courses</Link></Button>
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div><div className="overflow-hidden rounded-[2.5rem] bg-primary text-white">{course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-72 w-full object-cover opacity-85" /> : null}<div className="p-8 sm:p-10"><Badge variant="secondary">{course.subject}</Badge><h1 className="mt-5 text-4xl font-semibold sm:text-5xl">{course.title}</h1><p className="mt-5 text-lg leading-8 text-white/70">{course.description}</p></div></div>
      <h2 className="mt-10 text-2xl font-semibold">Course content</h2><div className="mt-5 space-y-3">{course.modules.map((module, index) => <div key={module.id} className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-700">Module {index + 1}</p><h3 className="mt-1 font-semibold">{module.title}</h3></div>{module.isFreePreview ? <Badge variant="secondary">Free preview</Badge> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}</div><p className="mt-2 text-sm text-muted-foreground">{module.resources.length} resources · {module.quizzes.length} quizzes</p></div>)}</div></div>
      <aside className="h-fit rounded-[2rem] border bg-white p-7 shadow-xl lg:sticky lg:top-24"><PlayCircle className="h-10 w-10 text-teal-600" /><p className="mt-5 text-sm text-muted-foreground">{course.accessType.replaceAll("_", " ").toLowerCase()} access</p><p className="mt-1 text-3xl font-semibold">{course.isFree ? "Free" : formatCurrency(course.price, currency)}</p><div className="mt-6 space-y-3 text-sm">{["Structured modules", "Recordings and resources", "Course quizzes", "EduTap Account access"].map((item) => <p key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-teal-600" />{item}</p>)}</div><Button asChild size="lg" className="mt-7 w-full"><Link href="/family/login">{course.isFree ? "Open EduTap Account" : "Sign in for access"}</Link></Button><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Course access and payment are separate from regular monthly class enrollment.</p></aside>
    </div>
  </div>;
}
