import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SearchParams = Record<string, string | undefined>;

export default async function RegistrationSuccessPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const isTeacher = params.type === "teacher";

  return (
    <section className="container flex min-h-[70vh] items-center justify-center py-16">
      <Card className="max-w-2xl rounded-lg bg-white/92 text-center">
        <CardContent className="p-8 md:p-10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-teal-700" />
          <h1 className="mt-6 text-3xl font-semibold tracking-normal">{isTeacher ? "Teacher request submitted" : "Institute workspace created"}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {isTeacher
              ? "Your registration request is now pending approval. EduTap admins can review your profile, package choice, and teacher details."
              : "Your institute, owner admin user, selected package, and trial subscription are ready. You can sign in with the owner email and password."}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href={isTeacher ? "/explore/teachers" : "/login"}>{isTeacher ? "View teachers" : "Sign in"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to homepage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
