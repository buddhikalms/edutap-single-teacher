import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { TeacherPasswordChangeForm } from "@/components/auth/teacher-password-change-form";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  if (!session.user.mustChangePassword) {
    redirect("/dashboard");
  }

  return <TeacherPasswordChangeForm />;
}
