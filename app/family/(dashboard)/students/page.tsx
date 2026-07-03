import Link from "next/link";
import { getFamilyContext } from "@/lib/family";

export default async function FamilyStudentsPage() {
  const context = await getFamilyContext();
  return <div><h2 className="text-2xl font-semibold">Linked students</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
    {context.students.map((student) => <Link href={`/family/students/${student.id}`} key={student.id} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-lg font-semibold">{student.firstName} {student.lastName}</p><p className="mt-1 text-sm text-muted-foreground">Student ID: {student.admissionNo}</p></Link>)}
  </div></div>;
}
