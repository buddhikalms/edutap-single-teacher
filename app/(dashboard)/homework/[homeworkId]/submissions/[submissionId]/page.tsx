import { notFound } from "next/navigation";
import { reviewHomeworkSubmission } from "@/app/(dashboard)/homework/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = {
  params: Promise<{ homeworkId: string; submissionId: string }>;
};

export default async function HomeworkSubmissionReviewPage({ params }: PageProps) {
  const { homeworkId, submissionId } = await params;
  const { instituteId } = await getTenantContext();
  const submission = await prisma.homeworkSubmission.findFirst({
    where: { id: submissionId, homeworkId, instituteId },
    include: {
      student: { include: { parents: true } },
      homework: { include: { classGroup: true } }
    }
  });

  if (!submission) {
    notFound();
  }

  async function action(formData: FormData) {
    "use server";
    await reviewHomeworkSubmission(homeworkId, formData);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Submission review</Badge>
        <h2 className="mt-4 text-3xl font-semibold">{submission.student.firstName} {submission.student.lastName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{submission.homework.title} · {submission.homework.classGroup.name}</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Student answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border bg-white/75 p-5">
              <p className="whitespace-pre-wrap text-sm leading-6">{submission.answerText ?? "No typed answer submitted."}</p>
            </div>
            {submission.attachmentUrl ? (
              <div className="rounded-xl border bg-white/75 p-4">
                <p className="text-xs text-muted-foreground">Student attachment</p>
                <AttachmentLink value={submission.attachmentUrl} />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Status" value={submission.status} />
              <Info label="Submitted" value={submission.submittedAt?.toLocaleString() ?? "-"} />
              <Info label="Deadline" value={submission.homework.deadline.toLocaleString()} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <input type="hidden" name="submissionId" value={submission.id} />
              <div className="space-y-2">
                <Label htmlFor="marksAwarded">Marks</Label>
                <Input id="marksAwarded" name="marksAwarded" type="number" min={0} max={submission.homework.marks} step="0.5" defaultValue={submission.marksAwarded?.toString() ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewStatus">Decision</Label>
                <Select id="reviewStatus" name="reviewStatus" defaultValue={submission.reviewStatus ?? "ACCEPTED"}>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="RESUBMIT">Resubmit</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Student status</Label>
                <Select id="status" name="status" defaultValue="REVIEWED">
                  <option value="REVIEWED">Reviewed</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="LATE">Late</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea id="feedback" name="feedback" defaultValue={submission.feedback ?? ""} className="min-h-[140px]" />
              </div>
              <Button type="submit" className="w-full">Save review</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AttachmentLink({ value }: { value: string }) {
  const isLink = value.startsWith("/") || /^https?:\/\//i.test(value);

  if (!isLink) {
    return <p className="mt-1 font-semibold">{value}</p>;
  }

  return (
    <Button asChild variant="outline" size="sm" className="mt-3">
      <a href={value} target="_blank" rel="noreferrer">
        Open attachment
      </a>
    </Button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/75 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
