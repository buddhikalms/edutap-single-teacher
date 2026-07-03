import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { SetupWizard } from "@/app/setup/setup-wizard";
import { hasTeacherOwner } from "@/lib/single-teacher";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasTeacherOwner()) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.2),_transparent_30%),linear-gradient(135deg,#f8fafc,#f7f5ef)] px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 flex max-w-3xl items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-glow"><GraduationCap className="h-6 w-6" /></div>
        <div><p className="text-xl font-bold">EduTap</p><p className="text-sm text-muted-foreground">Single Teacher LMS setup</p></div>
      </div>
      <SetupWizard />
    </main>
  );
}
