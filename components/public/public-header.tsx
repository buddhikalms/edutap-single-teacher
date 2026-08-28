"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap, LogIn, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_BRAND_NAME } from "@/lib/brand";

const navItems = [
  { href: "/classes", label: "Classes" },
  { href: "/courses", label: "Courses" },
  { href: "/teacher", label: "Teacher" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

type PublicBrand = {
  name?: string | null;
  logoUrl?: string | null;
};

export function PublicHeader({ brand }: { brand?: PublicBrand }) {
  const [isOpen, setIsOpen] = useState(false);
  const logoUrl = brand?.logoUrl;
  const name = brand?.name || APP_BRAND_NAME;

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/88 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold" onClick={() => setIsOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : <GraduationCap className="h-5 w-5" />}
          </span>
          <span className="text-lg">{name}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/student/login">
              <LogIn className="h-4 w-4" />
              Student login
            </Link>
          </Button>
          <Button asChild>
            <Link href="/student/register">
              Request enrollment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label={isOpen ? "Close public navigation" : "Open public navigation"}
          aria-controls="public-mobile-navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      {isOpen ? (
        <div id="public-mobile-navigation" className="border-t border-border/70 bg-white lg:hidden">
          <nav className="container grid gap-1 py-3" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t pt-3 md:hidden">
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/student/login" onClick={() => setIsOpen(false)}>
                  <LogIn className="h-4 w-4" />
                  Student login
                </Link>
              </Button>
              <Button asChild className="justify-start">
                <Link href="/student/register" onClick={() => setIsOpen(false)}>
                  Request enrollment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
