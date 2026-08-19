import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, ShieldOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { StaffFaceEnrollmentPanel } from "@/components/face-attendance/StaffFaceEnrollmentPanel";
import { revokeStudentBiometricConsent, updateStudentFaceProfileStatus } from "./actions";

export default async function StudentFaceManagementPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { studentId } = await params;

  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        branch: true,
        user: { select: { email: true } },
        faceProfile: true,
        biometricConsents: {
          where: { consentType: "FACE_ATTENDANCE" },
          orderBy: { createdAt: "desc" },
          take: 1
        },
        faceVerificationAttempts: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { attendanceSession: { include: { classGroup: true } } }
        }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId } })
  ]);

  if (!student) notFound();

  const profile = student.faceProfile;
  const consent = student.biometricConsents[0] ?? null;

  async function activateAction() {
    "use server";
    await updateStudentFaceProfileStatus(studentId, "ACTIVE");
  }

  async function suspendAction() {
    "use server";
    await updateStudentFaceProfileStatus(studentId, "SUSPENDED");
  }

  async function deleteAction() {
    "use server";
    await updateStudentFaceProfileStatus(studentId, "DELETED");
  }

  async function revokeAction() {
    "use server";
    await revokeStudentBiometricConsent(studentId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Student profile
            </Link>
          </Button>
          <h2 className="mt-4 text-3xl font-semibold">Face ID Management</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {student.firstName} {student.lastName} · {student.admissionNo} · {student.branch.name}
          </p>
        </div>
        <Badge variant={profile?.status === "ACTIVE" ? "success" : profile ? "warning" : "outline"}>{profile?.status.toLowerCase() ?? "not enrolled"}</Badge>
      </div>

      {!settings?.faceAttendanceEnabled ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm font-medium text-amber-950">
            Face attendance is disabled for this institute. Enable it from `/admin/settings/face-attendance` or run `npm run face:enable -- {instituteId}`.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Profile Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Face profile" value={profile?.status ?? "Not enrolled"} />
              <Info label="Consent" value={consent?.consented && !consent.revokedAt ? "Accepted" : consent?.revokedAt ? "Revoked" : "Missing"} />
              <Info label="Enrolled" value={profile?.enrolledAt ? profile.enrolledAt.toLocaleString() : "-"} />
              <Info label="Last verified" value={profile?.lastVerifiedAt ? profile.lastVerifiedAt.toLocaleString() : "-"} />
              <Info label="Model" value={profile?.recognitionModel ?? settings?.faceRecognitionModel ?? "insightface"} />
              <Info label="Model version" value={profile?.modelVersion ?? settings?.faceRecognitionModelVersion ?? "configured-version"} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <form action={activateAction}>
                <Button className="w-full" disabled={!profile || profile.status === "DELETED"}>
                  <CheckCircle2 className="h-4 w-4" />
                  Activate
                </Button>
              </form>
              <form action={suspendAction}>
                <Button className="w-full" variant="outline" disabled={!profile || profile.status === "DELETED"}>
                  <Ban className="h-4 w-4" />
                  Suspend
                </Button>
              </form>
              <form action={revokeAction}>
                <Button className="w-full" variant="outline">
                  <ShieldOff className="h-4 w-4" />
                  Revoke Consent
                </Button>
              </form>
              <form action={deleteAction}>
                <Button className="w-full" variant="destructive" disabled={!profile || profile.status === "DELETED"}>
                  <Trash2 className="h-4 w-4" />
                  Delete Template
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Staff Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffFaceEnrollmentPanel
              studentId={student.id}
              studentName={`${student.firstName} ${student.lastName}`}
              hasProfile={Boolean(profile && profile.status !== "DELETED")}
              enabled={Boolean(settings?.faceAttendanceEnabled)}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent Face Attempts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {student.faceVerificationAttempts.length ? (
            student.faceVerificationAttempts.map((attempt) => (
              <div key={attempt.id} className="flex flex-col justify-between gap-3 rounded-xl border bg-white/70 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold">{attempt.attendanceSession?.classGroup.name ?? "No class session"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{attempt.createdAt.toLocaleString()}</p>
                  {attempt.failureCode ? <p className="mt-1 text-xs text-muted-foreground">{attempt.failureCode}</p> : null}
                </div>
                <div className="text-left sm:text-right">
                  <Badge variant={attempt.result === "VERIFIED" ? "success" : attempt.result === "UNCERTAIN" ? "warning" : "outline"}>{attempt.result.toLowerCase()}</Badge>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Match {attempt.faceSimilarity?.toFixed(2) ?? "-"} · Live {attempt.livenessScore?.toFixed(2) ?? "-"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
              <p className="font-semibold">No face attempts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Verification attempts appear after the student uses face attendance.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
