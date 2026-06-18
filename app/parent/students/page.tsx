import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPortalContext } from "@/lib/portal";

export default async function ParentStudentsPage() {
  const context = await getPortalContext();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Badge variant="secondary">Parent portal</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">Linked students</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only students linked to your parent account are visible here.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {context.students.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  {student.firstName} {student.lastName}
                </CardTitle>
                <CardDescription>{student.admissionNo}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="outline">{student.status}</Badge>
                {student.email ? <Badge variant="secondary">{student.email}</Badge> : null}
                {student.phone ? <Badge variant="secondary">{student.phone}</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
