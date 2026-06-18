import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseCard, ClassCard, PricingCard, TeacherCard } from "@/components/public/public-cards";
import { PublicShell, SectionHeading } from "@/components/public/site-shell";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { heroStats, publicClasses, publicCourses, publicFeatures, publicPlans, publicTeachers } from "@/lib/public-site";

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=2200&q=85" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-primary/76" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>
        <div className="container grid min-h-[680px] items-end gap-10 pb-16 pt-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl pb-8 text-white">
            <Badge className="bg-white/15 text-white">Public LMS website + SaaS platform</Badge>
            <h1 className="mt-5 text-5xl font-semibold tracking-normal sm:text-7xl">EduTap</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">
              A premium learning platform where students discover teachers, courses, live classes, and institutes run attendance, payments, homework, quizzes, recordings, and parent communication.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href="/courses">
                  Explore courses
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/18">
                <Link href="/register/institute">
                  Start an institute
                  <PlayCircle className="h-4 w-4" />
                </Link>
              </Button>
              <InstallAppButton variant="button" />
            </div>
          </div>
          <div className="grid gap-3 pb-2 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/18 bg-white/12 p-4 text-white backdrop-blur">
                <stat.icon className="h-5 w-5 text-amber-200" />
                <p className="mt-4 text-sm text-white/68">{stat.label}</p>
                <p className="mt-1 font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Value proposition"
            title="One platform for course discovery and institute operations"
            description="EduTap separates structured courses from recurring classes, so students understand what they are buying and admins can manage teaching, attendance, payments, and learning assets without confusion."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {["Courses with modules, resources, recordings, quizzes, and fixed duration", "Regular weekly or monthly classes with branch, schedule, fee, and attendance", "Teacher and institute onboarding with package limits", "Premium student, parent, teacher, and admin workflows"].map((item) => (
              <div key={item} className="rounded-lg border bg-white/80 p-4 shadow-luxury">
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
                <p className="mt-3 text-sm leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Teachers" title="Featured teacher profiles" />
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/explore/teachers">View all</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {publicTeachers.map((teacher) => (
            <TeacherCard key={teacher.slug} teacher={teacher} />
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Online classes" title="Live and hybrid classes ready to join" />
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/online-classes">Online schedule</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {publicClasses.filter((item) => item.classType !== "Inhouse").map((classItem) => (
            <ClassCard key={classItem.slug} classItem={classItem} />
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Courses" title="Structured learning programs" />
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/courses">View courses</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {publicCourses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      </section>

      <section className="bg-white/70 py-16">
        <div className="container">
          <SectionHeading align="center" eyebrow="Features" title="Built for the actual rhythm of an education business" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {publicFeatures.map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-white p-5 shadow-luxury">
                <feature.icon className="h-6 w-6 text-teal-700" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <SectionHeading align="center" eyebrow="Pricing preview" title="Packages for single teachers and full institutes" />
        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {publicPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="container pb-20">
        <div className="rounded-lg bg-primary p-8 text-white shadow-luxury md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-normal">Bring your teachers, classes, and courses online.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">Register as a teacher or create an institute workspace and choose the package that matches your growth stage.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-white text-primary hover:bg-white/90">
                <Link href="/register/teacher">Teacher signup</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white/18">
                <Link href="/register/institute">Institute signup</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
