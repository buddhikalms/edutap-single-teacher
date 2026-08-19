import { redirect } from "next/navigation";

export default async function DashboardStudentFaceRedirect({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  redirect(`/students/${studentId}/face`);
}
