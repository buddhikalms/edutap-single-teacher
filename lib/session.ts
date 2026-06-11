import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getTenantContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.instituteId) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    userName: session.user.name ?? "ClassCard User",
    instituteId: session.user.instituteId,
    branchId: session.user.branchId,
    role: session.user.role
  };
}

export type ActionState = {
  ok: boolean;
  message: string;
};

export function actionError(error: unknown, fallback: string): ActionState {
  console.error(error);
  return {
    ok: false,
    message: fallback
  };
}
