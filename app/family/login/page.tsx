import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FamilyLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.role === "FAMILY") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountStatus: true } });
    if (user?.accountStatus === "ACTIVE") redirect("/family/dashboard");
    if (user) redirect("/family/pending");
  }
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.22),_transparent_30%),linear-gradient(135deg,#07111f_0%,#10213a_56%,#f7f9fc_56%)] px-4 py-10">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center"><div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_460px]">
      <div className="max-w-xl text-white"><p className="text-sm font-semibold uppercase text-white/60">EduTap</p><h2 className="mt-4 text-4xl font-bold sm:text-5xl">One account for the whole learning journey.</h2><p className="mt-5 leading-7 text-white/70">Access linked students, classes, homework, quizzes, attendance, payments, and notifications.</p></div>
      <PortalLoginForm />
    </div></div>
  </main>;
}
