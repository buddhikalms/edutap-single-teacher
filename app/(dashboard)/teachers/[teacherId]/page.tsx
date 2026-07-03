import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Mail, Phone, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function TeacherProfilePage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { teacherId } = await params;

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, instituteId },
    include: {
      branch: true,
      classGroups: {
        include: {
          subject: true,
          _count: { select: { enrollments: true } }
        },
        orderBy: { name: "asc" }
      }
    }
  });

  if (!teacher) {
    notFound();
  }

  const totalStudents = teacher.classGroups.reduce((total, classGroup) => total + classGroup._count.enrollments, 0);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/teachers">
            <ArrowLeft className="h-4 w-4" />
            Teachers
          </Link>
        </Button>
      </div>

      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Teacher profile</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{teacher.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{teacher.specialty ?? "General faculty"} · {teacher.branch.name}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={BookOpen} label="Classes" value={String(teacher.classGroups.length)} />
            <Info icon={UsersRound} label="Students" value={String(totalStudents)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactLine icon={Mail} label="Email" value={teacher.email} />
            <ContactLine icon={Phone} label="Phone" value={teacher.phone ?? "Not added"} />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assigned classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacher.classGroups.length ? (
              teacher.classGroups.map((classGroup) => (
                <Link key={classGroup.id} href={`/dashboard/classes/${classGroup.id}`} className="block rounded-xl border bg-white/70 p-4 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{classGroup.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {classGroup.subject.name ?? classGroup.subject.name} · {classGroup.schedule}
                      </p>
                    </div>
                    <Badge variant="outline">{classGroup._count.enrollments} students</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
                <p className="font-semibold">No classes assigned</p>
                <p className="mt-1 text-sm text-muted-foreground">Assign classes from the teacher edit form.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
