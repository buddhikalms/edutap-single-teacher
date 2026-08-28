import { Award, BookOpenCheck, GraduationCap, HeartHandshake, MapPin } from "lucide-react";
import { PageHero, SectionHeading } from "@/components/public/site-shell";
import { getPublicTeacher } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const teacher = await getPublicTeacher();
  if (!teacher) return null;
  return <>
    <PageHero title={`Meet ${teacher.name}`} description={teacher.specialty || "A dedicated private educator focused on confident, measurable student progress."} />
    <section className="container grid gap-10 py-16 lg:grid-cols-[380px_1fr]">
      <div className="h-fit overflow-hidden rounded-[2rem] border bg-primary p-3 shadow-xl">
        {teacher.photoUrl ? <img src={teacher.photoUrl} alt={teacher.name} className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-teal-500 to-primary text-white"><GraduationCap className="h-28 w-28" /></div>}
      </div>
      <div>
        <SectionHeading eyebrow="Teaching with purpose" title="Structure, encouragement, and clear communication" description={teacher.bio || `${teacher.name} combines focused instruction with modern learning tools so students know what to do next and parents stay meaningfully informed.`} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Fact icon={Award} title="Experience" value={teacher.experience || "Experienced private educator"} />
          <Fact icon={BookOpenCheck} title="Qualifications" value={teacher.qualifications || "Subject-focused teaching expertise"} />
          <Fact icon={HeartHandshake} title="Teaching mode" value={teacher.teachingMode.toLowerCase()} />
          <Fact icon={MapPin} title="Learning location" value={teacher.branch?.location || teacher.branch?.name || "Online"} />
        </div>
      </div>
    </section>
  </>;
}

function Fact({ icon: Icon, title, value }: { icon: typeof Award; title: string; value: string }) {
  return <div className="rounded-3xl border bg-white p-6"><Icon className="h-5 w-5 text-teal-600" /><p className="mt-4 text-sm text-muted-foreground">{title}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>;
}
