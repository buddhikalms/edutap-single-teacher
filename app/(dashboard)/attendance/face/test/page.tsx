import { redirect } from "next/navigation";
import { FaceAttendanceTestPanel } from "@/components/face-attendance/FaceAttendanceTestPanel";
import { canAccess } from "@/lib/rbac";
import { getTenantContext } from "@/lib/session";

export default async function FaceAttendanceTestPage() {
  const context = await getTenantContext();
  if (!canAccess(context.role, "attendance")) redirect("/dashboard");

  return <FaceAttendanceTestPanel />;
}
