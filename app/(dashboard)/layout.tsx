import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Sidebar } from "@/components/layout/sidebar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARENT" || session.user.role === "STUDENT") {
    redirect("/portal");
  }

  const institute = session.user.instituteId
    ? await prisma.institute.findUnique({
        where: { id: session.user.instituteId },
        select: { name: true }
      })
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f3f6f9_100%)]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <Sidebar className="sticky top-0 hidden h-screen lg:flex" role={session.user.role} />
        <div className="min-w-0">
          <DashboardHeader
            instituteName={institute?.name ?? "ClassCard Workspace"}
            user={{
              name: session.user.name ?? "ClassCard User",
              email: session.user.email ?? "user@classcard.test",
              role: session.user.role
            }}
          />
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
