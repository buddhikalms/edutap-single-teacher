import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { authOptions } from "@/lib/auth";

export default async function PortalLoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "PARENT" || session?.user?.role === "STUDENT") {
    redirect("/portal");
  }

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.22),_transparent_30%),linear-gradient(135deg,#07111f_0%,#10213a_56%,#f7f9fc_56%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_460px]">
          <div className="max-w-xl text-white">
            <p className="text-sm font-semibold uppercase tracking-normal text-white/60">EduTap</p>
            <h2 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">A calm, premium window into student progress.</h2>
            <p className="mt-5 text-base leading-7 text-white/70">
              Parents and students can review attendance, dues, receipts, class updates, and notices from one secure portal.
            </p>
          </div>
          <PortalLoginForm />
        </div>
      </div>
    </main>
  );
}
