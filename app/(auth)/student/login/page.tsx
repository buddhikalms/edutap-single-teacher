import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StudentFirstLoginForm } from "@/components/auth/student-first-login-form";
import { authOptions } from "@/lib/auth";

export default async function StudentLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "STUDENT") redirect("/student/dashboard");

  return <StudentFirstLoginForm />;
}
