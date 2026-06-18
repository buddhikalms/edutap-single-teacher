import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PricingCard } from "@/components/public/public-cards";
import { PageHero, SectionHeading } from "@/components/public/site-shell";
import { Button } from "@/components/ui/button";
import { publicPlans } from "@/lib/public-site";

export default function PricingPage() {
  return (
    <>
      <PageHero
        title="EduTap Pricing"
        description="Choose a SaaS package for a single teacher, starter institute, scaled institute, or enterprise education network."
        image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-14">
        <SectionHeading align="center" eyebrow="Packages" title="Clear limits, useful features, and room to grow" />
        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {publicPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>
      <section className="container pb-16">
        <div className="rounded-lg border bg-white/88 p-8 shadow-luxury md:p-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">Reached a package limit?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                EduTap can show an upgrade prompt when a workspace reaches teacher, student, branch, class, course, storage, live class, parent notification, or custom branding limits.
              </p>
            </div>
            <Button asChild>
              <Link href="/register/institute">
                Start with a package
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
