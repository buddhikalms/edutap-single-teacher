import Link from "next/link";
import { TeacherRegistrationForm } from "@/components/public/registration-forms";
import { PageHero } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherRegisterPage() {
  return (
    <>
      <PageHero
        title="Teacher Registration"
        description="Submit your profile, teaching mode, grades, qualifications, and preferred EduTap package for admin approval."
        image="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1800&q=80"
      />
      <section className="container py-12">
        <Card className="mx-auto max-w-4xl rounded-lg bg-white/90">
          <CardContent className="p-6 md:p-8">
            <TeacherRegistrationForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Registering an institute instead?{" "}
              <Link href="/register/institute" className="font-semibold text-primary hover:underline">
                Create institute
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
