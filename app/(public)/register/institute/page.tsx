import Link from "next/link";
import { InstituteRegistrationForm } from "@/components/public/registration-forms";
import { PageHero } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function InstituteRegisterPage() {
  return (
    <>
      <PageHero
        title="Institute Registration"
        description="Create an EduTap workspace, owner admin account, selected package, branch capacity, and trial subscription."
        image="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-12">
        <Card className="mx-auto max-w-4xl rounded-lg bg-white/90">
          <CardContent className="p-6 md:p-8">
            <InstituteRegistrationForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Applying as an individual teacher?{" "}
              <Link href="/register/teacher" className="font-semibold text-primary hover:underline">
                Teacher registration
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
