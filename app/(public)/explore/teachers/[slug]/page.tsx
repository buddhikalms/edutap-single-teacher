import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarClock, GraduationCap, Star } from "lucide-react";
import { ClassCard, CourseCard } from "@/components/public/public-cards";
import { PageHero, SectionHeading } from "@/components/public/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTeacher, publicClasses, publicCourses } from "@/lib/public-site";

export default async function TeacherProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const teacher = getTeacher(slug);

  if (!teacher) {
    notFound();
  }

  const courses = publicCourses.filter((course) => course.teacherSlug === teacher.slug);
  const classes = publicClasses.filter((classItem) => classItem.teacherSlug === teacher.slug);

  return (
    <>
      <PageHero title={teacher.name} description={teacher.bio} image={teacher.photo}>
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-white text-primary">{teacher.subject} teacher</Badge>
          <Badge className="bg-white/15 text-white">{teacher.mode}</Badge>
          <Badge className="bg-white/15 text-white">{teacher.experience}</Badge>
        </div>
      </PageHero>

      <section className="container grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          <section>
            <SectionHeading eyebrow="Profile" title="Teaching focus" description={teacher.bio} />
            <div className="mt-6 flex flex-wrap gap-2">
              {teacher.subjects.map((subject) => (
                <Badge key={subject} variant="secondary">
                  {subject}
                </Badge>
              ))}
            </div>
          </section>

          {courses.length ? (
            <section>
              <SectionHeading eyebrow="Courses" title="Structured courses" />
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {courses.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
            </section>
          ) : null}

          {classes.length ? (
            <section>
              <SectionHeading eyebrow="Classes" title="Regular classes" />
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {classes.map((classItem) => (
                  <ClassCard key={classItem.slug} classItem={classItem} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-lg bg-white/90">
            <CardContent className="p-6">
              <div className="grid gap-4 text-sm">
                <Info icon={GraduationCap} label="Qualifications" value={teacher.qualifications} />
                <Info icon={BookOpen} label="Grades" value={teacher.grades.join(", ")} />
                <Info icon={CalendarClock} label="Mode" value={teacher.mode} />
                <Info icon={Star} label="Rating" value={`${teacher.rating} / 5`} />
              </div>
              <Button asChild className="mt-6 w-full">
                <Link href="/register/institute">Enroll with EduTap</Link>
              </Button>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href="/explore/teachers">All teachers</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/35 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-teal-700" />
        {label}
      </div>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
