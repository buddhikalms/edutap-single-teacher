import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.22),_transparent_28%),linear-gradient(135deg,#f8fafc_0%,#edf2f7_42%,#f7f5ef_100%)]">
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-white/70 bg-primary p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-glow">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">EduTap</p>
              <p className="text-xs text-white/60">Single Teacher LMS</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/80">
              <Sparkles className="h-4 w-4 text-accent" />
              Your complete private teaching workspace
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal">
              Teach, manage, and grow from one calm workspace.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/70">
              Classes, courses, attendance, payments, homework, quizzes, resources, and parent communication together.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              ["99.9%", "ready foundation"],
              ["Role-based", "access control"],
              ["Realtime", "dashboard views"]
            ].map(([value, label]) => (
              <div key={value} className="rounded-xl border border-white/10 bg-white/10 p-4">
                <p className="font-semibold">{value}</p>
                <p className="mt-1 text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-[460px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold">EduTap</p>
                <p className="text-xs text-muted-foreground">Single Teacher LMS</p>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Secure teacher workspace
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
