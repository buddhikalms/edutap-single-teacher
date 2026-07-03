import { FamilyNav } from "@/components/family/family-nav";
import { StudentSwitcher } from "@/components/family/student-switcher";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { WebPushPermissionCard } from "@/components/pwa/web-push-permission-card";
import { getFamilyContext } from "@/lib/family";

export default async function FamilyDashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getFamilyContext();
  return <main className="min-h-screen bg-slate-50">
    <header className="bg-primary text-white"><div className="mx-auto max-w-7xl space-y-4 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs text-white/60">EduTap Account</p><h1 className="text-xl font-semibold">Welcome, {context.userName}</h1></div>
        <StudentSwitcher selectedId={context.selectedStudent.id} students={context.students.map((student) => ({ id: student.id, name: `${student.firstName} ${student.lastName}`.trim() }))} />
      </div>
      <FamilyNav />
    </div></header>
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6"><div className="grid gap-3 lg:grid-cols-2"><InstallAppButton /><WebPushPermissionCard /></div>{children}</div>
  </main>;
}
