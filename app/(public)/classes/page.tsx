import { ClassCatalog } from "@/components/public/class-catalog";
import { PageHero } from "@/components/public/site-shell";
import { getPublicClasses, getPublicTeacher } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [classes, teacher] = await Promise.all([getPublicClasses(), getPublicTeacher()]);
  return (
    <>
      <PageHero title="Regular classes, clearly organised" description="Browse weekly and monthly learning groups by grade, subject, delivery type, location, and schedule." />
      <section className="container py-16"><ClassCatalog classes={classes} currency={teacher?.institute.settings?.currency ?? "LKR"} /></section>
    </>
  );
}
