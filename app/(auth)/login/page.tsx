import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";
import { hasTeacherOwner } from "@/lib/single-teacher";
import { teacherPortalUrl } from "@/lib/teacher-tenancy";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasTeacherOwner())) {
    redirect("/setup");
  }

  const session = await getServerSession(authOptions);

  if (session?.user?.role === "PARENT" || session?.user?.role === "STUDENT") {
    redirect("/portal");
  }

  if (session?.user?.role === "TEACHER" && session.user.mustChangePassword) {
    redirect("/change-password");
  }

  if (session?.user?.role === "TEACHER" && session.user.teacherSlug) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const protocol = headerList.get("x-forwarded-proto");
    redirect(teacherPortalUrl(session.user.teacherSlug, "/dashboard", host, protocol));
  }

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
