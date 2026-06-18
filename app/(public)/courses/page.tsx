import { Search } from "lucide-react";
import { CourseCard } from "@/components/public/public-cards";
import { PageHero } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { publicCourses, searchText, uniqueValues } from "@/lib/public-site";

type SearchParams = Record<string, string | undefined>;

export default async function CoursesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const query = params.q?.toLowerCase() ?? "";
  const grade = params.grade ?? "";
  const subject = params.subject ?? "";
  const pricing = params.pricing ?? "";
  const duration = params.duration ?? "";

  const courses = publicCourses.filter((course) => {
    const haystack = searchText(course.title, course.description, course.category, course.subject, course.grade);
    return (
      (!query || haystack.includes(query)) &&
      (!grade || course.grade === grade) &&
      (!subject || course.subject === subject) &&
      (!pricing || (pricing === "Free" ? course.isFree : !course.isFree)) &&
      (!duration || course.durationType === duration)
    );
  });

  return (
    <>
      <PageHero
        title="Courses"
        description="Structured programs with modules, recordings, resources, quizzes, homework, access rules, and clear duration."
        image="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-10">
        <form className="grid gap-3 rounded-lg border bg-white/88 p-4 shadow-luxury md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Search courses..." className="pl-9" />
          </div>
          <Select name="grade" defaultValue={grade}>
            <option value="">All grades</option>
            {uniqueValues(publicCourses, (course) => course.grade).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="subject" defaultValue={subject}>
            <option value="">All subjects</option>
            {uniqueValues(publicCourses, (course) => course.subject).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="pricing" defaultValue={pricing}>
            <option value="">Free or paid</option>
            <option>Free</option>
            <option>Paid</option>
          </Select>
          <Select name="duration" defaultValue={duration}>
            <option value="">Any duration</option>
            <option>Days</option>
            <option>Weeks</option>
            <option>Months</option>
            <option>Lifetime</option>
          </Select>
          <Button type="submit">Filter</Button>
        </form>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      </section>
    </>
  );
}
