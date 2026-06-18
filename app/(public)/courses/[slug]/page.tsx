import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, FileText, PlayCircle, UserRound } from "lucide-react";
import { PageHero, SectionHeading } from "@/components/public/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseDuration, getCourse, getTeacher } from "@/lib/public-site";
import { formatCurrency } from "@/lib/utils";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);

  if (!course) {
    notFound();
  }

  const teacher = getTeacher(course.teacherSlug);

  return (
    <>
      <PageHero title={course.title} description={course.description} image={course.thumbnail}>
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-white text-primary">{course.isFree ? "Free course" : "Paid course"}</Badge>
          <Badge className="bg-white/15 text-white">{course.status}</Badge>
          <Badge className="bg-white/15 text-white">{courseDuration(course)}</Badge>
        </div>
      </PageHero>

      <section className="container grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section>
            <SectionHeading eyebrow="Description" title="What students will learn" />
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">{course.description}</p>
          </section>
          <DetailList icon={CheckCircle2} title="Modules" items={course.modules} />
          <DetailList icon={PlayCircle} title="Recordings preview" items={course.recordings} />
          <DetailList icon={FileText} title="Resources preview" items={course.resources} />
          <div className="grid gap-5 md:grid-cols-2">
            <DetailList icon={CheckCircle2} title="Quizzes" items={course.quizzes} />
            <DetailList icon={FileText} title="Homework" items={course.homework} />
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-lg bg-white/90">
            <CardContent className="p-6">
              <p className="text-sm font-semibold text-muted-foreground">Course price</p>
              <p className="mt-2 text-3xl font-semibold">{course.isFree ? "Free" : formatCurrency(course.price, "LKR")}</p>
              <div className="mt-6 grid gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-700" />
                  {courseDuration(course)}
                </span>
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-teal-700" />
                  {teacher?.name ?? "EduTap teacher"}
                </span>
                <span className="rounded-lg bg-muted px-3 py-2">{course.accessType}</span>
              </div>
              <Button asChild className="mt-6 w-full">
                <Link href="/register/institute">Enroll now</Link>
              </Button>
              {teacher ? (
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link href={`/explore/teachers/${teacher.slug}`}>View teacher</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}

function DetailList({ icon: Icon, title, items }: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Icon className="h-5 w-5 text-teal-700" />
        {title}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border bg-white/82 p-4 text-sm shadow-luxury">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
