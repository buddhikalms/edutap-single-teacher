import type { LiveClassAccessType, LiveClassMeetingProvider, LiveClassStatus } from "@prisma/client";
import type React from "react";
import { CalendarClock, Link2, Radio, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { selectedStudentIds } from "@/lib/live-classes";

const providerOptions: Array<{
  value: LiveClassMeetingProvider;
  title: string;
  description: string;
  icon: typeof Video;
}> = [
  { value: "ZOOM_AUTO", title: "Zoom", description: "Create a Zoom room from your connected account.", icon: Video },
  { value: "GOOGLE_MEET_AUTO", title: "Google Meet Auto Meeting", description: "Create a Calendar event with a generated Meet link.", icon: CalendarClock },
  { value: "EXTERNAL_ZOOM", title: "External Zoom Link", description: "Paste a Zoom room created outside InstituteOS.", icon: Link2 },
  { value: "EXTERNAL_GOOGLE_MEET", title: "External Google Meet Link", description: "Paste a Google Meet room created outside InstituteOS.", icon: Link2 },
  { value: "YOUTUBE_LIVE", title: "YouTube Live Link", description: "Publish a YouTube Live URL for students.", icon: Radio },
  { value: "OTHER_LINK", title: "Other Link", description: "Use any secure class room or livestream URL.", icon: Link2 }
];

type LiveClassFormProps = {
  action: (formData: FormData) => Promise<void>;
  classes: Array<{ id: string; name: string; subject: { name: string }; teacherId: string | null }>;
  students: Array<{ id: string; admissionNo: string; firstName: string; lastName: string }>;
  liveClass?: {
    title: string;
    description: string | null;
    classGroupId: string;
    courseId: string | null;
    teacherId: string | null;
    meetingProvider: LiveClassMeetingProvider;
    meetingUrl: string;
    externalUrl: string | null;
    startTime: Date;
    durationMinutes: number;
    accessType: LiveClassAccessType;
    price: unknown;
    status: LiveClassStatus;
    recordingEnabled: boolean;
    targetStudentIds: unknown;
  };
};

function dateValue(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export function LiveClassForm({ action, classes, students, liveClass }: LiveClassFormProps) {
  const selectedStudents = new Set(selectedStudentIds(liveClass?.targetStudentIds));
  const selectedProvider = liveClass?.meetingProvider ?? "GOOGLE_MEET_AUTO";
  const externalUrl = liveClass?.externalUrl ?? (!["ZOOM_AUTO", "GOOGLE_MEET_AUTO"].includes(selectedProvider) ? liveClass?.meetingUrl : "");

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Live class details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" htmlFor="title">
            <Input id="title" name="title" defaultValue={liveClass?.title ?? ""} required />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={liveClass?.description ?? ""} className="min-h-[130px]" />
          </Field>
          <div>
            <Field label="Class group" htmlFor="classGroupId">
              <Select id="classGroupId" name="classGroupId" defaultValue={liveClass?.classGroupId ?? classes[0]?.id} required>
                {classes.map((classGroup) => (
                  <option key={classGroup.id} value={classGroup.id}>
                    {classGroup.name} - {classGroup.subject.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Meeting provider" htmlFor="meetingProvider">
            <div className="grid gap-3 md:grid-cols-2">
              {providerOptions.map((provider) => (
                <label key={provider.value} className="relative flex cursor-pointer gap-3 rounded-xl border bg-white/75 p-4 text-sm transition hover:border-primary/50 hover:bg-white">
                  <input
                    id={provider.value}
                    type="radio"
                    name="meetingProvider"
                    value={provider.value}
                    defaultChecked={selectedProvider === provider.value}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white text-primary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    <provider.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{provider.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{provider.description}</span>
                  </span>
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-primary peer-checked:ring-2" />
                </label>
              ))}
            </div>
          </Field>
          <Field label="External meeting URL" htmlFor="externalUrl">
            <Input id="externalUrl" name="externalUrl" type="url" defaultValue={externalUrl ?? ""} placeholder="https://meet.google.com/... or https://youtube.com/live/..." />
            <p className="text-xs leading-5 text-muted-foreground">Required for external Zoom, Google Meet, YouTube Live, and Other Link. Auto providers generate the join URL on save.</p>
          </Field>
          <div className="rounded-xl border bg-white/70 p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Zoom meeting settings</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Toggle name="waitingRoom" label="Waiting room" checked />
              <Toggle name="passcode" label="Passcode" checked />
              <Toggle name="joinBeforeHost" label="Join before host" />
              <Toggle name="muteOnEntry" label="Mute on entry" checked />
              <Toggle name="hostVideo" label="Host video" checked />
              <Toggle name="participantVideo" label="Participant video" />
              <Toggle name="recurring" label="Recurring meeting" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Recording" htmlFor="recording">
                <Select id="recording" name="recording" defaultValue={liveClass?.recordingEnabled ? "cloud" : "none"}>
                  <option value="none">None</option>
                  <option value="local">Local</option>
                  <option value="cloud">Cloud</option>
                </Select>
              </Field>
              <Field label="Alternative host" htmlFor="alternativeHosts">
                <Input id="alternativeHosts" name="alternativeHosts" type="email" placeholder="host@example.com" />
              </Field>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date and time" htmlFor="startTime">
              <Input id="startTime" name="startTime" type="datetime-local" defaultValue={liveClass ? dateValue(liveClass.startTime) : ""} required />
            </Field>
            <Field label="Duration minutes" htmlFor="durationMinutes">
              <Input id="durationMinutes" name="durationMinutes" type="number" min={5} defaultValue={liveClass?.durationMinutes ?? 60} required />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Access" htmlFor="accessType">
              <Select id="accessType" name="accessType" defaultValue={liveClass?.accessType ?? "FREE"}>
                <option value="FREE">Free</option>
                <option value="PAID">Paid / locked</option>
              </Select>
            </Field>
            <Field label="Price" htmlFor="price">
              <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={String(liveClass?.price ?? 0)} />
            </Field>
            <Field label="Publish state" htmlFor="status">
              <Select id="status" name="status" defaultValue={liveClass?.status ?? "DRAFT"}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-3 rounded-xl border bg-white/70 p-4 text-sm">
            <input type="checkbox" name="recordingEnabled" defaultChecked={liveClass?.recordingEnabled ?? false} className="h-4 w-4" />
            <span>
              <span className="block font-semibold">Enable recording placeholder</span>
              <span className="text-xs text-muted-foreground">Recording URLs can be added after the class and published as course resources.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Audience</CardTitle>
              <Badge variant="outline">{selectedStudents.size ? `${selectedStudents.size} selected` : "Whole class"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Leave all unchecked to assign this live class to every active student in the class.</p>
            <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg border bg-white/70 p-3 text-sm">
                  <input type="checkbox" name="studentIds" value={student.id} defaultChecked={selectedStudents.has(student.id)} className="h-4 w-4" />
                  <span>
                    <span className="block font-semibold">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{student.admissionNo}</span>
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full">
          {liveClass ? "Update Meeting" : "Create Meeting"}
        </Button>
      </div>
    </form>
  );
}

function Toggle({ name, label, checked = false }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-white/80 px-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </label>
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
