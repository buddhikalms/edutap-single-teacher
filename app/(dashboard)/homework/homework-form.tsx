import { HomeworkStatus } from "@prisma/client";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type HomeworkFormProps = {
  action: (formData: FormData) => Promise<void>;
  classes: Array<{ id: string; name: string; courseId: string; course: { name: string } }>;
  courses: Array<{ id: string; name: string }>;
  students: Array<{ id: string; admissionNo: string; firstName: string; lastName: string }>;
  homework?: {
    title: string;
    description: string;
    deadline: Date;
    marks: number;
    status: HomeworkStatus;
    classGroupId: string;
    courseId: string | null;
    externalLinks: unknown;
    attachments: Array<{ name: string; url: string; type?: string | null }>;
    submissions: Array<{ studentId: string }>;
  };
};

function dateValue(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

function linksValue(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export function HomeworkForm({ action, classes, courses, students, homework }: HomeworkFormProps) {
  const selectedStudents = new Set(homework?.submissions.map((submission) => submission.studentId) ?? []);

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Homework details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" htmlFor="title">
            <Input id="title" name="title" defaultValue={homework?.title ?? ""} required />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={homework?.description ?? ""} required className="min-h-[150px]" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Deadline" htmlFor="deadline">
              <Input id="deadline" name="deadline" type="datetime-local" defaultValue={homework ? dateValue(homework.deadline) : ""} required />
            </Field>
            <Field label="Marks" htmlFor="marks">
              <Input id="marks" name="marks" type="number" min={0} defaultValue={homework?.marks ?? 10} required />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Class" htmlFor="classGroupId">
              <Select id="classGroupId" name="classGroupId" defaultValue={homework?.classGroupId ?? classes[0]?.id} required>
                {classes.map((classGroup) => (
                  <option key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Course" htmlFor="courseId">
              <Select id="courseId" name="courseId" defaultValue={homework?.courseId ?? ""}>
                <option value="">Use class course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={homework?.status ?? "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </Field>
          <Field label="External links" htmlFor="externalLinks">
            <Textarea id="externalLinks" name="externalLinks" defaultValue={linksValue(homework?.externalLinks)} placeholder="One URL per line" />
          </Field>
          <Field label="Upload files" htmlFor="attachmentFiles">
            <Input id="attachmentFiles" name="attachmentFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
            <p className="text-xs leading-5 text-muted-foreground">Upload images, PDFs, Office documents, or text files. Each file can be up to 15 MB.</p>
          </Field>
          <Field label="Attachment links or notes" htmlFor="attachments">
            <Textarea
              id="attachments"
              name="attachments"
              defaultValue={homework?.attachments.map((item) => item.url).join("\n") ?? ""}
              placeholder="Optional: one URL or note per line"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assign students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Leave all unchecked to assign everyone actively enrolled in the selected class.</p>
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
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
          Save homework
        </Button>
      </div>
    </form>
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
