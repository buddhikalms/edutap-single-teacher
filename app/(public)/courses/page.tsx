import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Layers3 } from "lucide-react";
import { PageHero } from "@/components/public/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicCourses, getPublicTeacher } from "@/lib/public-catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [courses, teacher] = await Promise.all([getPublicCourses(), getPublicTeacher()]);
  const currency = teacher?.institute.settings?.currency ?? "LKR";
  return <>
    <PageHero title="Learn beyond the weekly class" description="Courses are structured learning products with modules, recordings, resources, papers, and quizzes. They remain separate from regular class enrollment." />
    <section className="container py-16">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => <article key={course.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt={course.title} className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100"><BookOpen className="h-14 w-14 text-primary" /></div>}
          <div className="p-6"><div className="flex items-center justify-between"><Badge variant="secondary">{course.subject}</Badge><span className="font-semibold">{course.isFree ? "Free" : formatCurrency(course.price, currency)}</span></div><h2 className="mt-4 text-xl font-semibold">{course.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{course.description || "A structured learning program with guided content and resources."}</p><div className="mt-5 flex gap-4 text-xs text-muted-foreground"><span className="flex gap-1"><Layers3 className="h-4 w-4" />{course.moduleCount} modules</span><span className="flex gap-1"><Clock3 className="h-4 w-4" />{course.durationType.toLowerCase()}</span></div><Button asChild className="mt-6 w-full"><Link href={`/courses/${course.slug}`}>View course <ArrowRight className="h-4 w-4" /></Link></Button></div>
        </article>)}
      </div>
    </section>
  </>;
}
