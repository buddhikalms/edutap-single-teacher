import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Clock, CreditCard, MapPin, Star, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { courseDuration, type PublicClass, type PublicCourse, type PublicPlan, type PublicTeacher, teacherName } from "@/lib/public-site";
import { formatCurrency } from "@/lib/utils";

export function TeacherCard({ teacher }: { teacher: PublicTeacher }) {
  return (
    <Card className="overflow-hidden rounded-lg bg-white/88">
      <img src={teacher.photo} alt={teacher.name} className="h-56 w-full object-cover" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{teacher.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{teacher.subject} teacher</p>
          </div>
          <Badge variant="secondary">{teacher.mode}</Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {teacher.rating} rating
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {teacher.grades.slice(0, 3).map((grade) => (
            <span key={grade} className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
              {grade}
            </span>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href={`/explore/teachers/${teacher.slug}`}>
            View profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CourseCard({ course }: { course: PublicCourse }) {
  return (
    <Card className="overflow-hidden rounded-lg bg-white/88">
      <div className="relative">
        <img src={course.thumbnail} alt={course.title} className="h-52 w-full object-cover" />
        <Badge className="absolute left-4 top-4" variant={course.isFree ? "secondary" : "default"}>
          {course.isFree ? "Free" : "Paid"}
        </Badge>
      </div>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Clock className="h-4 w-4" />
          {courseDuration(course)}
        </div>
        <h3 className="mt-3 text-lg font-semibold">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{course.description}</p>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            {teacherName(course.teacherSlug)}
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {course.isFree ? "Free access" : formatCurrency(course.price, "LKR")}
          </span>
        </div>
        <Button asChild className="mt-5 w-full">
          <Link href={`/courses/${course.slug}`}>
            View course
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ClassCard({ classItem }: { classItem: PublicClass }) {
  return (
    <Card className="rounded-lg bg-white/88">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline">{classItem.classType}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{classItem.name}</h3>
          </div>
          <Badge variant={classItem.status === "Limited seats" ? "warning" : "secondary"}>{classItem.status}</Badge>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {classItem.branch}
          </span>
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {classItem.schedule}
          </span>
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            {teacherName(classItem.teacherSlug)}
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">Monthly fee</span>
          <span className="font-semibold">{formatCurrency(classItem.monthlyFee, "LKR")}</span>
        </div>
        <Button asChild className="mt-5 w-full">
          <Link href="/register/institute">
            Enroll now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PricingCard({ plan }: { plan: PublicPlan }) {
  return (
    <Card className={`relative rounded-lg bg-white/90 ${plan.recommended ? "border-amber-300 ring-2 ring-amber-200" : ""}`}>
      {plan.recommended ? <Badge className="absolute right-5 top-5" variant="warning">Recommended</Badge> : null}
      <CardContent className="p-6">
        <h3 className="pr-28 text-xl font-semibold">{plan.name}</h3>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">{plan.summary}</p>
        <div className="mt-6">
          {plan.monthlyPrice == null ? (
            <p className="text-3xl font-semibold">Custom</p>
          ) : (
            <p className="text-3xl font-semibold">
              ${plan.monthlyPrice}
              <span className="text-sm font-medium text-muted-foreground">/month</span>
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{plan.yearlyPrice == null ? "Annual contract available" : `$${plan.yearlyPrice}/year`}</p>
        </div>
        <Button asChild className="mt-6 w-full" variant={plan.recommended ? "default" : "outline"}>
          <Link href={plan.id === "SINGLE_TEACHER" ? "/register/teacher" : "/register/institute"}>Choose package</Link>
        </Button>
        <div className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <div key={feature} className="flex gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Limitations</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {plan.limitations.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
