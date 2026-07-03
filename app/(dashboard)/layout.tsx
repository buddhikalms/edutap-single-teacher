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

  const [institute, pendingEnrollmentCount] = session.user.instituteId
    ? await Promise.all([prisma.institute.findUnique({
        where: { id: session.user.instituteId },
        select: { name: true }
      }), prisma.enrollmentRequest.count({
        where: { instituteId: session.user.instituteId, status: "PENDING" }
      })])
    : [null, 0];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f3f6f9_100%)]">
      <div className="grid min-h-screen lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar className="sticky top-0 hidden self-start lg:flex" role={session.user.role} pendingEnrollmentCount={pendingEnrollmentCount} />
        <div className="min-w-0">
          <DashboardHeader
            instituteName={institute?.name ?? "My Teaching Workspace"}
            pendingEnrollmentCount={pendingEnrollmentCount}
            user={{
              name: session.user.name ?? "EduTap User",
              email: session.user.email ?? "user@edutap.test",
              role: session.user.role
            }}
          />
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
