"use client";

import { useMemo, useState, useTransition } from "react";
import { BellRing, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createNotice } from "@/app/(dashboard)/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StudentOption = {
  id: string;
  name: string;
  admissionNo: string;
  classGroupIds: string[];
};

type ClassOption = {
  id: string;
  name: string;
  code: string;
};

type NoticeRow = {
  id: string;
  title: string;
  audience: string;
  type: string;
  createdAt: string;
  count: number;
};

type LogRow = {
  id: string;
  title: string;
  channel: string;
  status: string;
  target: string | null;
  createdAt: string;
};

export function NotificationCenter({
  classes,
  students,
  notices,
  logs
}: {
  classes: ClassOption[];
  students: StudentOption[];
  notices: NoticeRow[];
  logs: LogRow[];
}) {
  const [audience, setAudience] = useState("INSTITUTE");
  const [classGroupId, setClassGroupId] = useState(classes[0]?.id ?? "");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const visibleStudents = useMemo(() => {
    if (audience !== "CLASS" || !classGroupId) {
      return students;
    }

    return students.filter((student) => student.classGroupIds.includes(classGroupId));
  }, [audience, classGroupId, students]);

  function toggleStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  }

  function handleSubmit(formData: FormData) {
    const input = {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      audience: audience as "INSTITUTE" | "CLASS" | "STUDENTS",
      type: String(formData.get("type") ?? "NOTICE") as "NOTICE",
      channel: String(formData.get("channel") ?? "IN_APP") as "IN_APP",
      classGroupId: audience === "CLASS" ? classGroupId : undefined,
      studentIds: audience === "STUDENTS" ? selectedStudents : []
    };

    startTransition(async () => {
      const result = await createNotice(input);
      if (result.ok) {
        toast.success(result.message);
        setSelectedStudents([]);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-white/70">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Compose notification</CardTitle>
              <CardDescription>Send institute, class, or student-specific notices with delivery logs.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Payment reminder, class update..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select id="type" name="type" defaultValue="NOTICE">
                  <option value="NOTICE">General notice</option>
                  <option value="PAYMENT_DUE">Payment due reminder</option>
                  <option value="ABSENT_ALERT">Absent alert</option>
                  <option value="CLASS_NOTICE">Class notice</option>
                  <option value="RECEIPT">Receipt notification</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select id="channel" name="channel" defaultValue="IN_APP">
                  <option value="IN_APP">In-app now</option>
                  <option value="PUSH">Push queued</option>
                  <option value="SMS">SMS ready</option>
                  <option value="WHATSAPP">WhatsApp ready</option>
                  <option value="EMAIL">Email ready</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Audience</Label>
                <Select id="audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
                  <option value="INSTITUTE">Whole institute</option>
                  <option value="CLASS">Class</option>
                  <option value="STUDENTS">Selected students</option>
                </Select>
              </div>
            </div>

            {audience === "CLASS" ? (
              <div className="space-y-2">
                <Label htmlFor="classGroup">Class</Label>
                <Select id="classGroup" value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)}>
                  {classes.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name} ({classGroup.code})
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {audience === "STUDENTS" ? (
              <div className="rounded-2xl border bg-muted/35 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Select students</p>
                    <p className="text-xs text-muted-foreground">{selectedStudents.length} selected</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedStudents(visibleStudents.map((student) => student.id))}>
                    Select all
                  </Button>
                </div>
                <div className="grid max-h-72 gap-2 overflow-auto md:grid-cols-2">
                  {visibleStudents.map((student) => (
                    <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 text-sm">
                      <Checkbox checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                      <span>
                        <span className="font-semibold">{student.name}</span>
                        <span className="block text-xs text-muted-foreground">{student.admissionNo}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" name="body" rows={6} placeholder="Write a concise parent-friendly message..." required />
            </div>

            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send notification
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sent history</CardTitle>
            <CardDescription>Recent notices and recipient counts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.length === 0 ? <p className="text-sm text-muted-foreground">No notices yet.</p> : null}
            {notices.map((notice) => (
              <div key={notice.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{notice.title}</p>
                  <Badge variant="outline">{notice.count}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {notice.type} · {notice.audience} · {new Date(notice.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery logs</CardTitle>
            <CardDescription>Push/SMS/WhatsApp providers can consume queued rows later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 rounded-2xl border bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{log.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.channel} · {log.status} · {log.target ?? "Portal inbox"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
