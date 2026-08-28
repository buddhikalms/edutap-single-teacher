import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PublicHeader } from "@/components/public/public-header";
import { APP_BRAND_NAME } from "@/lib/brand";
import { getPublicTeacher } from "@/lib/public-catalog";

const navItems = [
  { href: "/classes", label: "Classes" },
  { href: "/courses", label: "Courses" },
  { href: "/teacher", label: "Teacher" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const teacher = await getPublicTeacher();
  const logoUrl = teacher?.logoUrl ?? teacher?.institute.settings?.logoPlaceholder ?? teacher?.institute.logoUrl ?? null;
  const brandName = teacher?.displayName ?? teacher?.name ?? teacher?.institute.name ?? null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef7f3_42%,#fff8ec_100%)] text-foreground">
      <PublicHeader brand={{ name: brandName, logoUrl }} />
      <main>{children}</main>
      <PublicFooter brand={{ name: brandName, logoUrl }} />
    </div>
  );
}

export function PublicFooter({ brand }: { brand?: { name?: string | null; logoUrl?: string | null } }) {
  const name = brand?.name || APP_BRAND_NAME;
  const logoUrl = brand?.logoUrl;

  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/12">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-5 w-5" />}
            </span>
            {name}
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
            A connected learning space for classes, courses, resources, attendance, and clear family communication.
          </p>
        </div>
        <div>
          <p className="font-semibold">Explore</p>
          <div className="mt-3 grid gap-2 text-sm text-white/72">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold">Student access</p>
          <div className="mt-3 grid gap-2 text-sm text-white/72">
            <Link href="/student/register" className="hover:text-white">
              Request class enrollment
            </Link>
            <Link href="/student/login" className="hover:text-white">
              Student login
            </Link>
            <Link href="/login" className="hover:text-white">
              Teacher dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-normal text-primary sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function PageHero({ title, description, image, children }: { title: string; description: string; image?: string; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
        <div className={`absolute inset-0 ${image ? "bg-primary/72" : "bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,.38),transparent_30%),linear-gradient(135deg,#092f39,#164e63)]"}`} />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="container flex min-h-[360px] flex-col justify-end pb-14 pt-24 text-white">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">{description}</p>
          {children ? <div className="mt-7">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
