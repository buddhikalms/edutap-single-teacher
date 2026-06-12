import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Edit, FileText, XCircle } from "lucide-react";
import { closeHomework, publishHomework } from "@/app/(dashboard)/homework/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ homeworkId: string }>;
};

function statusBadge(status: string) {
  if (status === "REVIEWED" || status === "SUBMITTED") return "success" as const;
  if (status === "LATE" || status === "MISSING") return "warning" as const;
  return "outline" as const;
}

export default async function HomeworkDetailPage({ params }: PageProps) {
  const { homeworkId } = await params;
  const { instituteId } = await getTenantContext();
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, instituteId },
    include: {
      classGroup: true,
      course: true,
      attachments: true,
      submissions: {
        include: { student: true },
        orderBy: [{ status: "asc" }, { student: { firstName: "asc" } }]
      }
    }
  });

  if (!homework) {
    notFound();
  }

  const submitted = homework.submissions.filter((item) => ["SUBMITTED", "LATE", "REVIEWED"].includes(item.status)).length;
  const reviewed = homework.submissions.filter((item) => item.status === "REVIEWED").length;
  const late = homework.submissions.filter((item) => item.status === "LATE").length;
  const missing = homework.submissions.filter((item) => item.status === "MISSING").length;
  const progress = homework.submissions.length ? Math.round((submitted / homework.submissions.length) * 100) : 0;

  async function publishAction() {
    "use server";
    await publishHomework(homeworkId);
  }

  async function closeAction() {
    "use server";
    await closeHomework(homeworkId);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant={homework.status === "PUBLISHED" ? "success" : homework.status === "CLOSED" ? "warning" : "outline"}>{homework.status.toLowerCase()}</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">{homework.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{homework.classGroup.name} · {homework.course?.name ?? "Class course"} · Due {homework.deadline.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/homework/${homework.id}/edit`}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <form action={publishAction}>
              <Button type="submit" variant="outline">Publish</Button>
            </form>
            <form action={closeAction}>
              <Button type="submit" variant="outline">Close</Button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={FileText} label="Submitted" value={`${submitted}/${homework.submissions.length}`} />
        <Metric icon={CheckCircle2} label="Reviewed" value={String(reviewed)} />
        <Metric icon={Clock} label="Late" value={String(late)} />
        <Metric icon={XCircle} label="Missing" value={String(missing)} />
      </section>

      <Card className="glass-panel">
        <CardContent className="p-6">
          <p className="text-sm leading-6 text-muted-foreground">{homework.description}</p>
          <div className="mt-5 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
          </div>
          {homework.attachments.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {homework.attachments.map((attachment) => (
                <AttachmentBadge key={attachment.id} name={attachment.name} url={attachment.url} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-white/75">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Marks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {homework.submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{submission.student.firstName} {submission.student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{submission.student.admissionNo}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant={statusBadge(submission.status)}>{submission.status.toLowerCase()}</Badge></td>
                    <td className="px-4 py-3">{submission.submittedAt?.toLocaleString() ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{submission.marksAwarded ? `${submission.marksAwarded}/${homework.marks}` : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/homework/${homework.id}/submissions/${submission.id}`}>Review</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttachmentBadge({ name, url }: { name: string; url: string }) {
  const isLink = url.startsWith("/") || /^https?:\/\//i.test(url);

  if (!isLink) {
    return <Badge variant="outline">{url}</Badge>;
  }

  return (
    <Button asChild variant="outline" size="sm">
      <a href={url} target="_blank" rel="noreferrer">
        {name || url}
      </a>
    </Button>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{label === "Revenue" ? formatCurrency(value) : value}</p>
      </CardContent>
    </Card>
  );
}
