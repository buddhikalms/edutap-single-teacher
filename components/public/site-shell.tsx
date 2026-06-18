import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/explore/teachers", label: "Teachers" },
  { href: "/courses", label: "Courses" },
  { href: "/explore/classes", label: "Classes" },
  { href: "/online-classes", label: "Online" },
  { href: "/pricing", label: "Pricing" }
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef7f3_42%,#fff8ec_100%)] text-foreground">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/88 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg">EduTap</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/login">
              <LayoutDashboard className="h-4 w-4" />
              Sign in
            </Link>
          </Button>
          <Button asChild>
            <Link href="/register/institute">
              Start institute
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" className="md:hidden" aria-label="Open public navigation">
          <Link href="/pricing">
            <Menu className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
              <BookOpen className="h-5 w-5" />
            </span>
            EduTap LMS
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
            Public course discovery, teacher onboarding, institute SaaS billing, and daily education operations in one modern platform.
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
          <p className="font-semibold">Join EduTap</p>
          <div className="mt-3 grid gap-2 text-sm text-white/72">
            <Link href="/register/teacher" className="hover:text-white">
              Register as teacher
            </Link>
            <Link href="/register/institute" className="hover:text-white">
              Register institute
            </Link>
            <Link href="/login" className="hover:text-white">
              Dashboard sign in
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

export function PageHero({ title, description, image, children }: { title: string; description: string; image: string; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/72" />
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
