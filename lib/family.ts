import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/portal";

export async function getFamilyContext() {
  const context = await getPortalContext();
  if (context.role !== "FAMILY") redirect("/family/login");
  const selectedId = (await cookies()).get("edutap-selected-student")?.value;
  const selectedStudent = context.students.find((student) => student.id === selectedId) ?? context.students[0];
  if (!selectedStudent) redirect("/family/pending");
  return { ...context, selectedStudent };
}
