import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "PARENT" || session?.user?.role === "STUDENT") {
    redirect("/portal");
  }

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
