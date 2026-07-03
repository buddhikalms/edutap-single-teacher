import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasTeacherOwner } from "@/lib/single-teacher";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session) redirect("/dashboard");
  redirect((await hasTeacherOwner()) ? "/login" : "/setup");
}
