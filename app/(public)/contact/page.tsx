import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { getPublicTeacher } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const teacher = await getPublicTeacher();
  if (!teacher) return null;
  return <>
    <PageHero title="Let’s find the right learning path" description="For class enrollment, use the request form so the teacher has everything needed to review your place." />
    <section className="container grid gap-8 py-16 lg:grid-cols-[1fr_1.1fr]">
      <div><h2 className="text-3xl font-semibold">Contact details</h2><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Questions about schedules, suitability, or course access are welcome. Enrollment requests receive priority through the class request form.</p><div className="mt-8 grid gap-4">
        <Contact icon={Phone} label="Phone" value={teacher.phone || "Available after request"} />
        <Contact icon={Mail} label="Email" value={teacher.email} />
        <Contact icon={MapPin} label="Location" value={teacher.branch.location || teacher.branch.name} />
      </div></div>
      <div className="rounded-[2rem] bg-primary p-8 text-white sm:p-10"><MessageCircle className="h-10 w-10 text-teal-300" /><h2 className="mt-6 text-3xl font-semibold">Interested in a regular class?</h2><p className="mt-4 leading-7 text-white/70">Choose a class and send the student and parent details. The teacher will personally review the request before creating access.</p><Button asChild size="lg" variant="secondary" className="mt-7"><Link href="/student/register">Request enrollment</Link></Button></div>
    </section>
  </>;
}

function Contact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return <div className="flex items-center gap-4 rounded-2xl border bg-white p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div></div>;
}

