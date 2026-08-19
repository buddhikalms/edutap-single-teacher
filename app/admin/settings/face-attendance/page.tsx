import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function FaceAttendanceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.instituteId || !["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) redirect("/login");

  const [settings, profileCount, attempts] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: session.user.instituteId } }),
    prisma.studentFaceProfile.count({ where: { student: { instituteId: session.user.instituteId }, status: "ACTIVE" } }),
    prisma.faceVerificationAttempt.groupBy({
      by: ["result"],
      where: { student: { instituteId: session.user.instituteId } },
      _count: { result: true }
    })
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Face Attendance</h1>
          <p className="text-sm text-muted-foreground">Biometric consent, thresholds, liveness, and privacy controls.</p>
        </div>
        <Badge variant={settings?.faceAttendanceEnabled ? "success" : "outline"}>{settings?.faceAttendanceEnabled ? "Enabled" : "Disabled"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active profiles</p><p className="mt-2 text-3xl font-semibold">{profileCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Match threshold</p><p className="mt-2 text-3xl font-semibold">{settings?.faceMatchThreshold ?? 0.82}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Max attempts</p><p className="mt-2 text-3xl font-semibold">{settings?.faceMaximumAttempts ?? 3}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Current Policy</h2>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>Student self-enrolment: <strong>{settings?.faceAllowStudentSelfEnrollment ? "Allowed" : "Disabled"}</strong></div>
            <div>Parent consent: <strong>{settings?.faceRequireParentConsent ? "Required" : "Optional"}</strong></div>
            <div>Liveness threshold: <strong>{settings?.faceLivenessThreshold ?? 0.85}</strong></div>
            <div>Manual review threshold: <strong>{settings?.faceManualReviewThreshold ?? 0.72}</strong></div>
            <div>Registered device required: <strong>{settings?.faceRequireRegisteredDevice ? "Yes" : "No"}</strong></div>
            <div>Location required: <strong>{settings?.faceRequireLocation ? "Yes" : "No"}</strong></div>
            <div>Model: <strong>{settings?.faceRecognitionModel ?? "insightface"}</strong></div>
            <div>Model version: <strong>{settings?.faceRecognitionModelVersion ?? "configured-version"}</strong></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold">Verification Results</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {attempts.map((item) => (
              <div key={item.result} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{item.result.toLowerCase()}</p>
                <p className="text-2xl font-semibold">{item._count.result}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
