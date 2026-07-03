import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GoogleEnrollmentForm } from "@/components/public/google-enrollment-form";
import { authOptions } from "@/lib/auth";
import { getPublicClasses } from "@/lib/public-catalog";
import { prisma } from "@/lib/prisma";

export default async function GoogleEnrollmentPage({ searchParams }: { searchParams: Promise<{ classGroupId?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "FAMILY") redirect("/family/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountStatus: true } });
  if (user?.accountStatus === "ACTIVE") redirect("/family/dashboard");
  if (await prisma.enrollmentRequest.findFirst({ where: { familyUserId: session.user.id }, select: { id: true } })) redirect("/family/pending");
  const classes = await getPublicClasses();
  const { classGroupId } = await searchParams;
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-lg rounded-3xl border bg-white p-7 shadow-xl">
    <p className="text-sm font-semibold text-teal-700">Google EduTap Account</p>
    <h1 className="mt-1 text-2xl font-semibold">Complete enrollment</h1>
    <p className="mb-6 mt-2 text-sm text-muted-foreground">Your Google name and email are verified. Add the remaining student details for teacher approval.</p>
    <GoogleEnrollmentForm initialClassId={classGroupId} classes={classes.map((item) => ({ id: item.id, name: item.name, gradeId: item.gradeId, grade: item.grade, subject: item.subject }))} />
  </div></main>;
}
