import { Search } from "lucide-react";
import { ClassCard } from "@/components/public/public-cards";
import { PageHero } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { publicClasses, publicTeachers, searchText, uniqueValues } from "@/lib/public-site";

type SearchParams = Record<string, string | undefined>;

export default async function ClassesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const query = params.q?.toLowerCase() ?? "";
  const branch = params.branch ?? "";
  const grade = params.grade ?? "";
  const subject = params.subject ?? "";
  const teacher = params.teacher ?? "";
  const type = params.type ?? "";

  const classes = publicClasses.filter((classItem) => {
    const teacherName = publicTeachers.find((item) => item.slug === classItem.teacherSlug)?.name ?? "";
    const haystack = searchText(classItem.name, classItem.branch, classItem.grade, classItem.subject, teacherName, classItem.schedule);
    return (
      (!query || haystack.includes(query)) &&
      (!branch || classItem.branch === branch) &&
      (!grade || classItem.grade === grade) &&
      (!subject || classItem.subject === subject) &&
      (!teacher || classItem.teacherSlug === teacher) &&
      (!type || classItem.classType === type)
    );
  });

  return (
    <>
      <PageHero
        title="Regular Classes"
        description="Weekly and monthly live, inhouse, and hybrid classes with branch, schedule, monthly fee, free period, and attendance settings."
        image="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-10">
        <form className="grid gap-3 rounded-lg border bg-white/88 p-4 shadow-luxury md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Search classes..." className="pl-9" />
          </div>
          <Select name="branch" defaultValue={branch}>
            <option value="">All branches</option>
            {uniqueValues(publicClasses, (item) => item.branch).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="grade" defaultValue={grade}>
            <option value="">All grades</option>
            {uniqueValues(publicClasses, (item) => item.grade).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="subject" defaultValue={subject}>
            <option value="">All subjects</option>
            {uniqueValues(publicClasses, (item) => item.subject).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="teacher" defaultValue={teacher}>
            <option value="">All teachers</option>
            {publicTeachers.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select name="type" defaultValue={type}>
            <option value="">Any type</option>
            <option>Inhouse</option>
            <option>Online</option>
            <option>Hybrid</option>
          </Select>
          <Button type="submit">Filter</Button>
        </form>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((classItem) => (
            <ClassCard key={classItem.slug} classItem={classItem} />
          ))}
        </div>
      </section>
    </>
  );
}
