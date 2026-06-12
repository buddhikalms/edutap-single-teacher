import type React from "react";
import { QuizStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QuizFormProps = {
  action: (formData: FormData) => Promise<void>;
  classes: Array<{ id: string; name: string; courseId: string; course: { name: string } }>;
  courses: Array<{ id: string; name: string }>;
  quiz?: {
    title: string;
    description: string | null;
    instructions: string | null;
    startsAt: Date;
    endsAt: Date;
    timeLimitMins: number;
    totalMarks: unknown;
    passMark: unknown;
    attemptLimit: number;
    status: QuizStatus;
    classGroupId: string;
    courseId: string | null;
  };
};

function dateValue(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export function QuizForm({ action, classes, courses, quiz }: QuizFormProps) {
  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Quiz setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" htmlFor="title"><Input id="title" name="title" defaultValue={quiz?.title ?? ""} required /></Field>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" defaultValue={quiz?.description ?? ""} /></Field>
          <Field label="Instructions" htmlFor="instructions"><Textarea id="instructions" name="instructions" defaultValue={quiz?.instructions ?? ""} className="min-h-[130px]" /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start date" htmlFor="startsAt"><Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={quiz ? dateValue(quiz.startsAt) : ""} required /></Field>
            <Field label="End date" htmlFor="endsAt"><Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={quiz ? dateValue(quiz.endsAt) : ""} required /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Time limit" htmlFor="timeLimitMins"><Input id="timeLimitMins" name="timeLimitMins" type="number" min={1} defaultValue={quiz?.timeLimitMins ?? 30} /></Field>
            <Field label="Pass mark" htmlFor="passMark"><Input id="passMark" name="passMark" type="number" min={0} step="0.5" defaultValue={quiz?.passMark?.toString() ?? 0} /></Field>
            <Field label="Attempt limit" htmlFor="attemptLimit"><Input id="attemptLimit" name="attemptLimit" type="number" min={1} defaultValue={quiz?.attemptLimit ?? 1} /></Field>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Class" htmlFor="classGroupId">
              <Select id="classGroupId" name="classGroupId" defaultValue={quiz?.classGroupId ?? classes[0]?.id} required>
                {classes.map((classGroup) => <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>)}
              </Select>
            </Field>
            <Field label="Course" htmlFor="courseId">
              <Select id="courseId" name="courseId" defaultValue={quiz?.courseId ?? ""}>
                <option value="">Use class course</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={quiz?.status ?? "DRAFT"}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </Field>
            <input type="hidden" name="totalMarks" value={quiz?.totalMarks?.toString() ?? "0"} />
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full">Save and build questions</Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
