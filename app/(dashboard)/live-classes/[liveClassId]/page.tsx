import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import { CalendarClock, Clock, ExternalLink, Lock, Radio, UserCheck, Video } from "lucide-react";
import {
  addLiveClassRecording,
  deleteImportedZoomRecordingAction,
  deleteLiveClassAction,
  publishImportedZoomRecordingAction,
  setLiveClassStatus
} from "@/app/(dashboard)/live-classes/actions";
import { syncZoomRecordingAction } from "@/app/(dashboard)/live-classes/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyJoinLink } from "@/components/live-classes/meeting-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { classScopeForRole } from "@/lib/learning";
import { meetingProviderLabel } from "@/lib/live-meeting-providers";
import { isLiveClassLocked, liveClassRuntimeStatus, providerLabel, selectedStudentIds } from "@/lib/live-classes";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ liveClassId: string }> };

function badgeVariant(status: string) {
  if (status === "live") return "success" as const;
  if (status === "upcoming") return "secondary" as const;
  if (status === "completed") return "warning" as const;
  return "outline" as const;
}

export default async function LiveClassDetailPage({ params }: PageProps) {
  const { liveClassId } = await params;
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const liveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, instituteId, classGroup: scope },
    include: {
      classGroup: { include: { subject: true } },
      course: true,
      teacher: true,
      attendances: {
        include: { student: true },
        orderBy: { joinedAt: "desc" }
      },
      recordings: { orderBy: { createdAt: "desc" } },
      zoomMeeting: true
    }
  });

  if (!liveClass) notFound();

  const runtime = liveClassRuntimeStatus(liveClass);
  const locked = isLiveClassLocked(liveClass);
  const targets = selectedStudentIds(liveClass.targetStudentIds);
  const published = liveClass.status === "PUBLISHED";

  async function publishAction() {
    "use server";
    await setLiveClassStatus(liveClassId, "PUBLISHED");
  }

  async function unpublishAction() {
    "use server";
    await setLiveClassStatus(liveClassId, "DRAFT");
  }

  async function cancelAction() {
    "use server";
    await setLiveClassStatus(liveClassId, "CANCELLED");
  }

  async function recordingAction(formData: FormData) {
    "use server";
    await addLiveClassRecording(liveClassId, formData);
  }

  async function deleteAction() {
    "use server";
    await deleteLiveClassAction(liveClassId);
  }

  async function syncRecordingAction() {
    "use server";
    await syncZoomRecordingAction(liveClassId);
  }

  async function publishImportedRecordingAction() {
    "use server";
    await publishImportedZoomRecordingAction(liveClassId);
  }

  async function deleteImportedRecordingAction() {
    "use server";
    await deleteImportedZoomRecordingAction(liveClassId);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={badgeVariant(runtime)}>{runtime === "live" ? "Live now" : runtime}</Badge>
              <Badge variant={locked ? "warning" : "outline"}>{locked ? `Paid ${Number(liveClass.price).toFixed(2)}` : "Free access"}</Badge>
              <Badge variant="outline">{meetingProviderLabel(liveClass.meetingProvider) || providerLabel(liveClass.provider)}</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">{liveClass.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{liveClass.description ?? "No description added."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/live-classes/${liveClass.id}/edit`}>Edit</Link>
            </Button>
            <Button asChild>
              <a href={liveClass.startUrl ?? liveClass.meetingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Start Meeting
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={CalendarClock} label="Starts" value={liveClass.startTime.toLocaleString()} />
        <Metric icon={Clock} label="Duration" value={`${liveClass.durationMinutes} min`} />
        <Metric icon={UserCheck} label="Joined" value={String(liveClass.attendances.length)} />
        <Metric icon={targets.length ? Lock : Radio} label="Audience" value={targets.length ? `${targets.length} students` : "Whole class"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Meeting details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Info label="Join URL" value={liveClass.joinUrl ?? liveClass.meetingUrl} href={liveClass.joinUrl ?? liveClass.meetingUrl} />
              <Info label="Provider mode" value={meetingProviderLabel(liveClass.meetingProvider)} />
              <Info label="Meeting ID" value={liveClass.meetingId ?? "Not available"} />
              <Info label="Password" value={liveClass.meetingPassword ?? "Not available"} />
              <Info label="Calendar event" value={liveClass.calendarEventId ?? "Not available"} />
              <Info label="Host start URL" value={liveClass.startUrl ? "Available to teacher" : "Not available"} href={liveClass.startUrl ?? undefined} />
              <Info label="Zoom status" value={liveClass.zoomMeeting?.status ?? "Not synced"} />
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Meeting actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CopyJoinLink url={liveClass.joinUrl ?? liveClass.meetingUrl} />
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={liveClass.startUrl ?? liveClass.meetingUrl} target="_blank" rel="noreferrer">Start Meeting</a>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/live-classes/${liveClass.id}/edit`}>Edit Meeting</Link>
                </Button>
                {liveClass.meetingProvider === "ZOOM_AUTO" ? (
                  <form action={syncRecordingAction}>
                    <Button type="submit" variant="outline">Import Recording</Button>
                  </form>
                ) : null}
                <form action={deleteAction}>
                  <Button type="submit" variant="destructive">Delete Meeting</Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Joined student list</CardTitle>
            </CardHeader>
            <CardContent>
              {liveClass.attendances.length ? (
                <div className="overflow-hidden rounded-xl border bg-white/80">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {liveClass.attendances.map((attendance) => (
                        <tr key={attendance.id}>
                          <td className="px-4 py-3 font-semibold">
                            {attendance.student.firstName} {attendance.student.lastName}
                            <span className="block text-xs font-normal text-muted-foreground">{attendance.student.admissionNo}</span>
                          </td>
                          <td className="px-4 py-3">{attendance.joinedAt.toLocaleString()}</td>
                          <td className="px-4 py-3">{attendance.status.toLowerCase()}</td>
                          <td className="px-4 py-3">{attendance.durationWatched ? `${attendance.durationWatched} min` : "Placeholder"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No students have joined this live class yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recordings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveClass.recordings.length ? (
                liveClass.recordings.map((recording) => (
                  <div key={recording.id} className="rounded-xl border bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant={recording.accessType === "PAID" ? "warning" : "outline"}>{recording.accessType.toLowerCase()}</Badge>
                        <p className="mt-2 font-semibold">{recording.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{recording.description ?? "Course resource recording"}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={recording.recordingUrl} target="_blank" rel="noreferrer">Open</a>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {liveClass.zoomMeeting?.recordingUrl ? (
                    <div className="rounded-xl border bg-white/80 p-4">
                      <p className="font-semibold">Zoom recording found</p>
                      <a href={liveClass.zoomMeeting.recordingUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-primary">
                        {liveClass.zoomMeeting.recordingUrl}
                      </a>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={publishImportedRecordingAction}>
                          <Button type="submit" size="sm">Publish to students</Button>
                        </form>
                        <Button type="button" variant="outline" size="sm">Keep private</Button>
                        <form action={publishImportedRecordingAction}>
                          <Button type="submit" variant="outline" size="sm">Add to Course</Button>
                        </form>
                        <form action={deleteImportedRecordingAction}>
                          <Button type="submit" variant="destructive" size="sm">Delete</Button>
                        </form>
                      </div>
                    </div>
                  ) : null}
                  <p className="text-sm text-muted-foreground">Add a recording URL after class or import Zoom recording metadata when it is available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Teacher control panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={published ? unpublishAction : publishAction}>
                <Button className="w-full" type="submit" variant={published ? "outline" : "default"}>
                  {published ? "Unpublish" : "Publish"}
                </Button>
              </form>
              <form action={cancelAction}>
                <Button className="w-full" type="submit" variant="destructive">
                  Cancel live class
                </Button>
              </form>
              <p className="text-xs leading-5 text-muted-foreground">Reminder notification placeholder: publishing can trigger future reminders when push delivery is connected.</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Add recording</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={recordingAction} className="space-y-4">
                <Field label="Title" htmlFor="title">
                  <Input id="title" name="title" defaultValue={`${liveClass.title} recording`} required />
                </Field>
                <Field label="Recording URL" htmlFor="recordingUrl">
                  <Input id="recordingUrl" name="recordingUrl" type="url" defaultValue={liveClass.recordingUrl ?? ""} required />
                </Field>
                <Field label="Description" htmlFor="description">
                  <Textarea id="description" name="description" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Access" htmlFor="accessType">
                    <Select id="accessType" name="accessType" defaultValue="FREE">
                      <option value="FREE">Free</option>
                      <option value="PAID">Paid / locked</option>
                    </Select>
                  </Field>
                  <Field label="Price" htmlFor="price">
                    <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue="0" />
                  </Field>
                </div>
                <Button className="w-full" type="submit">
                  <Video className="h-4 w-4" />
                  Save recording
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-lg border bg-white/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-1 block truncate font-semibold text-primary">
          {value}
        </a>
      ) : (
        <p className="mt-1 truncate font-semibold">{value}</p>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
