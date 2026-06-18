import { Search } from "lucide-react";
import { TeacherCard } from "@/components/public/public-cards";
import { PageHero } from "@/components/public/site-shell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { publicTeachers, searchText, uniqueValues } from "@/lib/public-site";

type SearchParams = Record<string, string | undefined>;

export default async function TeachersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const query = params.q?.toLowerCase() ?? "";
  const subject = params.subject ?? "";
  const grade = params.grade ?? "";
  const mode = params.mode ?? "";

  const teachers = publicTeachers.filter((teacher) => {
    const haystack = searchText(teacher.name, teacher.subject, teacher.subjects.join(" "), teacher.grades.join(" "), teacher.bio);
    return (!query || haystack.includes(query)) && (!subject || teacher.subjects.includes(subject)) && (!grade || teacher.grades.includes(grade)) && (!mode || teacher.mode === mode);
  });

  return (
    <>
      <PageHero
        title="Teacher Directory"
        description="Search expert teachers by subject, grade, and online or physical teaching mode."
        image="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-10">
        <form className="grid gap-3 rounded-lg border bg-white/88 p-4 shadow-luxury md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Search teachers..." className="pl-9" />
          </div>
          <Select name="subject" defaultValue={subject}>
            <option value="">All subjects</option>
            {uniqueValues(publicTeachers, (teacher) => teacher.subjects).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="grade" defaultValue={grade}>
            <option value="">All grades</option>
            {uniqueValues(publicTeachers, (teacher) => teacher.grades).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select name="mode" defaultValue={mode}>
            <option value="">Any mode</option>
            <option>Online</option>
            <option>Physical</option>
            <option>Both</option>
            <option>Hybrid</option>
          </Select>
          <Button type="submit">Filter</Button>
        </form>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.slug} teacher={teacher} />
          ))}
        </div>
      </section>
    </>
  );
}
