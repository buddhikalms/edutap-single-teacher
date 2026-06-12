import Link from "next/link";
import { BookOpenCheck, Clock, FileText, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type SearchParams = Record<string, string | string[] | undefined>;

function param(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function statusVariant(status: string) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "CLOSED") return "warning" as const;
  return "outline" as const;
}

export default async function HomeworkPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const classGroupId = param(params, "classGroupId");
  const q = param(params, "q") ?? "";
  const scope = classScopeForRole({ userId, role, branchId });

  const [classes, homework] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId, ...scope },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.homework.findMany({
      where: {
        instituteId,
        classGroupId: classGroupId || undefined,
        classGroup: scope,
        OR: q
          ? [
              { title: { contains: q } },
              { description: { contains: q } },
              { classGroup: { name: { contains: q } } }
            ]
          : undefined
      },
      include: {
        classGroup: true,
        course: true,
        submissions: true
      },
      orderBy: { deadline: "asc" }
    })
  ]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Learning operations</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Homework management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Assign work, monitor submissions, handle late students, and review marks from a premium teacher workspace.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/homework/new">
              <Plus className="h-4 w-4" />
              Create homework
            </Link>
          </Button>
        </div>
      </section>

      <form className="glass-panel grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_260px_auto]" action="/homework">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input name="q" placeholder="Search homework, class, description" defaultValue={q} className="pl-9" />
        </div>
        <Select name="classGroupId" defaultValue={classGroupId ?? ""}>
          <option value="">All classes</option>
          {classes.map((classGroup) => (
            <option key={classGroup.id} value={classGroup.id}>
              {classGroup.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {homework.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {homework.map((item) => {
            const submitted = item.submissions.filter((submission) => ["SUBMITTED", "LATE", "REVIEWED"].includes(submission.status)).length;
            const late = item.submissions.filter((submission) => submission.status === "LATE").length;
            const total = item.submissions.length || 1;
            const progress = Math.round((submitted / total) * 100);
            return (
              <Link key={item.id} href={`/homework/${item.id}`}>
                <Card className="glass-panel h-full transition hover:-translate-y-0.5 hover:shadow-glow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant={statusVariant(item.status)}>{item.status.toLowerCase()}</Badge>
                        <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{item.classGroup.name} · {item.course?.name ?? "Class course"}</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Mini icon={Clock} label="Deadline" value={item.deadline.toLocaleDateString()} />
                      <Mini icon={BookOpenCheck} label="Submitted" value={`${submitted}/${item.submissions.length}`} />
                      <Mini icon={Clock} label="Late" value={String(late)} />
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No homework yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create the first assignment for a class and submissions will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white/70 p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
