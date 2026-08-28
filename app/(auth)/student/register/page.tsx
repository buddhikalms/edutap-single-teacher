import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnrollmentRequestForm } from "@/components/public/enrollment-request-form";
import { getPublicClasses } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export default async function StudentRegisterPage() {
  const classes = await getPublicClasses();
  return <div>
    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to website</Link>
    <p className="text-sm font-semibold text-teal-700">Class enrollment</p>
    <h2 className="mt-1 text-3xl font-semibold tracking-normal">Request your place</h2>
    <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">Send the class, student, and parent details in one form. The teacher reviews every request before parent access is enabled.</p>
    <EnrollmentRequestForm classes={classes.map((item) => ({ id: item.id, name: item.name, gradeId: item.gradeId, grade: item.grade, subject: item.subject, schedule: item.schedule }))} compact />
  </div>;
}
