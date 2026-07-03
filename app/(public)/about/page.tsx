import { BellRing, BookOpenCheck, ShieldCheck, Sparkles } from "lucide-react";
import { PageHero, SectionHeading } from "@/components/public/site-shell";

export default function AboutPage() {
  return <>
    <PageHero title="Learning feels better when everything is clear" description="EduTap connects the teacher, student, and family around one calm, trustworthy learning experience." />
    <section className="container py-16">
      <SectionHeading eyebrow="Why this learning space exists" title="Less administrative noise. More attention for every student." description="Regular classes and digital courses serve different learning needs here, while attendance, assignments, progress, resources, and communication remain beautifully organised." />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {[[Sparkles, "Thoughtfully modern", "A premium learning experience that stays simple on every screen."], [ShieldCheck, "Teacher approved", "Class enrollment is reviewed before accounts and access are created."], [BellRing, "Family connected", "Parents receive the updates that matter without chasing information."], [BookOpenCheck, "Built for progress", "Homework, quizzes, recordings, and resources support the work between lessons."]].map(([Icon, title, text]) => <div key={String(title)} className="rounded-3xl border bg-white p-7 shadow-sm"><Icon className="h-6 w-6 text-teal-600" /><h2 className="mt-5 text-xl font-semibold">{String(title)}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{String(text)}</p></div>)}
      </div>
    </section>
  </>;
}

