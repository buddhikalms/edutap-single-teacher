import { PortalNav } from "@/components/portal/portal-nav";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

export default async function FamilyPortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getPortalContext();
  const institute = await prisma.institute.findUnique({
    where: { id: context.instituteId },
    select: { name: true }
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)]">
      <header className="bg-primary text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/60">{institute?.name ?? "ClassCard Pro"}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal">Family Portal</h1>
              <p className="mt-2 text-sm text-white/60">
                Signed in as {context.userName} · {context.students.length} student{context.students.length === 1 ? "" : "s"} linked
              </p>
            </div>
            <PortalNav />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
