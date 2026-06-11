import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RegisterInstituteForm } from "@/components/auth/register-institute-form";
import { authOptions } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return <RegisterInstituteForm />;
}
