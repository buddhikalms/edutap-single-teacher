import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Fingerprint, Trash2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { deleteFingerprintCredential, saveFingerprintCredential, suspendFingerprintCredential } from "./actions";

export default async function StudentFingerprintPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { studentId } = await params;
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    include: {
      branch: true,
      fingerprintCredentials: { orderBy: { createdAt: "desc" } },
      fingerprintAttendanceEvents: { orderBy: { processedAt: "desc" }, take: 10, include: { classGroup: true } }
    }
  });
  if (!student) notFound();

  async function saveAction(formData: FormData) {
    "use server";
    await saveFingerprintCredential(studentId, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/students/${student.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Student profile
          </Link>
        </Button>
        <h2 className="mt-4 text-3xl font-semibold">Fingerprint Attendance</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {student.firstName} {student.lastName} · {student.admissionNo} · {student.branch.name}
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Machine Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={saveAction} className="space-y-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Fingerprint user ID from machine</span>
                <Input name="externalFingerprintId" placeholder="Example: 101 or STU001" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Device user ID / note</span>
                <Input name="deviceUserId" placeholder="Optional device-side user reference" />
              </label>
              <Button className="w-full">
                <Fingerprint className="h-4 w-4" />
                Save Mapping
              </Button>
            </form>
            <div className="rounded-xl border bg-white/70 p-4 text-sm text-muted-foreground">
              Enroll the fingerprint on your machine first, then enter the same machine user ID here. The LMS does not store fingerprint templates.
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Saved Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.fingerprintCredentials.length ? (
              student.fingerprintCredentials.map((credential) => {
                async function suspendAction() {
                  "use server";
                  await suspendFingerprintCredential(credential.id, studentId);
                }
                async function deleteAction() {
                  "use server";
                  await deleteFingerprintCredential(credential.id, studentId);
                }
                return (
                  <div key={credential.id} className="rounded-xl border bg-white/70 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-semibold">{credential.externalFingerprintId}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Last verified: {credential.lastVerifiedAt?.toLocaleString() ?? "-"}</p>
                      </div>
                      <Badge variant={credential.status === "ACTIVE" ? "success" : credential.status === "SUSPENDED" ? "warning" : "outline"}>
                        {credential.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <form action={suspendAction}>
                        <Button variant="outline" size="sm" disabled={credential.status !== "ACTIVE"}>
                          <Ban className="h-4 w-4" />
                          Suspend
                        </Button>
                      </form>
                      <form action={deleteAction}>
                        <Button variant="destructive" size="sm" disabled={credential.status === "DELETED"}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
                <p className="font-semibold">No fingerprint mapping yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add the machine user ID after enrolling the student on the fingerprint reader.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent Fingerprint Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {student.fingerprintAttendanceEvents.length ? (
            student.fingerprintAttendanceEvents.map((event) => (
              <div key={event.id} className="flex justify-between gap-4 rounded-xl border bg-white/70 p-4">
                <div>
                  <p className="font-semibold">{event.classGroup.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.deviceId} · {event.processedAt.toLocaleString()}</p>
                </div>
                <Badge variant={event.result === "SUCCESS" ? "success" : event.result === "DUPLICATE_ATTENDANCE" ? "warning" : "outline"}>{event.result.toLowerCase()}</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
              <p className="font-semibold">No fingerprint events yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Events appear after the machine bridge posts attendance.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
