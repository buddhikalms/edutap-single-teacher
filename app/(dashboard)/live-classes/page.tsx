import Link from "next/link";
import { CalendarDays, Clock, Lock, Plus, Radio, UsersRound, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { classScopeForRole } from "@/lib/learning";
import { meetingProviderLabel } from "@/lib/live-meeting-providers";
import { isLiveClassLocked, liveClassRuntimeStatus, providerLabel } from "@/lib/live-classes";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function badgeVariant(status: string) {
  if (status === "live") return "success" as const;
  if (status === "upcoming") return "secondary" as const;
  if (status === "completed") return "warning" as const;
  return "outline" as const;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default async function LiveClassesPage() {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const liveClasses = await prisma.liveClass.findMany({
    where: { instituteId, classGroup: scope },
    include: {
      classGroup: { include: { subject: true } },
      course: true,
      teacher: true,
      attendances: true,
      recordings: true
    },
    orderBy: { startTime: "asc" }
  });

  const grouped = liveClasses.reduce<Record<string, typeof liveClasses>>((acc, liveClass) => {
    const key = dayLabel(liveClass.startTime);
    acc[key] = acc[key] ?? [];
    acc[key].push(liveClass);
    return acc;
  }, {});

  const liveNow = liveClasses.filter((item) => liveClassRuntimeStatus(item) === "live").length;
  const upcoming = liveClasses.filter((item) => liveClassRuntimeStatus(item) === "upcoming").length;
  const completed = liveClasses.filter((item) => liveClassRuntimeStatus(item) === "completed").length;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Live learning</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Live Class Management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Schedule premium live sessions, control publishing, track joins, and convert recordings into course resources.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/live-classes/new">
              <Plus className="h-4 w-4" />
              Create live class
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/live-classes/settings">Provider settings</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={Radio} label="Live now" value={String(liveNow)} />
        <Metric icon={CalendarDays} label="Upcoming" value={String(upcoming)} />
        <Metric icon={Video} label="Completed" value={String(completed)} />
      </section>

      {liveClasses.length ? (
        <section className="space-y-5">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div className="rounded-2xl border bg-white/80 p-4">
                <CalendarDays className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">{date}</p>
                <p className="mt-1 text-xs text-muted-foreground">{items.length} sessions</p>
              </div>
              <div className="space-y-3">
                {items.map((liveClass) => {
                  const runtime = liveClassRuntimeStatus(liveClass);
                  const locked = isLiveClassLocked(liveClass);
                  return (
                    <Link key={liveClass.id} href={`/live-classes/${liveClass.id}`}>
                      <Card className="glass-panel transition hover:-translate-y-0.5 hover:shadow-glow">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={badgeVariant(runtime)}>{runtime === "live" ? "Live now" : runtime}</Badge>
                                <Badge variant={locked ? "warning" : "outline"}>{locked ? "Paid access" : "Free access"}</Badge>
                                <Badge variant="outline">{meetingProviderLabel(liveClass.meetingProvider) || providerLabel(liveClass.provider)}</Badge>
                              </div>
                              <h3 className="mt-3 text-xl font-semibold">{liveClass.title}</h3>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {liveClass.classGroup.name} - {liveClass.course?.name ?? "Class course"} - {liveClass.teacher?.name ?? "Teacher pending"}
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3 xl:w-[430px]">
                              <Mini icon={Clock} label="Time" value={liveClass.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                              <Mini icon={UsersRound} label="Joined" value={String(liveClass.attendances.length)} />
                              <Mini icon={locked ? Lock : Video} label="Duration" value={`${liveClass.durationMinutes} min`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-10 text-center">
            <Video className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No live classes yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Schedule your first live class and student join tracking will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
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
