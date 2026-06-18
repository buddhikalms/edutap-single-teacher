import Link from "next/link";
import { CalendarClock, Video } from "lucide-react";
import { ClassCard, TeacherCard } from "@/components/public/public-cards";
import { PageHero, SectionHeading } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicClasses, publicTeachers, teacherName, upcomingLiveSchedule } from "@/lib/public-site";

export default function OnlineClassesPage() {
  const onlineClasses = publicClasses.filter((classItem) => classItem.classType === "Online" || classItem.classType === "Hybrid");
  const teacherSlugs = Array.from(new Set(onlineClasses.map((item) => item.teacherSlug)));
  const teachers = publicTeachers.filter((teacher) => teacherSlugs.includes(teacher.slug));

  return (
    <>
      <PageHero
        title="Online Classes"
        description="Live and hybrid class schedules with teacher profiles, linked courses, recordings, and attendance-ready workflows."
        image="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-12">
        <SectionHeading eyebrow="Schedule" title="Upcoming live class schedule" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {upcomingLiveSchedule.map((item) => (
            <Card key={item.title} className="rounded-lg bg-white/88">
              <CardContent className="p-5">
                <Video className="h-6 w-6 text-teal-700" />
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{teacherName(item.teacherSlug)}</p>
                <div className="mt-5 flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
                  <CalendarClock className="h-4 w-4" />
                  {item.time}
                </div>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link href={`/courses/${item.courseSlug}`}>Linked course</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="container py-8">
        <SectionHeading eyebrow="Classes" title="Online and hybrid classes" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {onlineClasses.map((classItem) => (
            <ClassCard key={classItem.slug} classItem={classItem} />
          ))}
        </div>
      </section>
      <section className="container pb-16 pt-8">
        <SectionHeading eyebrow="Teachers" title="Online-ready teachers" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.slug} teacher={teacher} />
          ))}
        </div>
      </section>
    </>
  );
}
