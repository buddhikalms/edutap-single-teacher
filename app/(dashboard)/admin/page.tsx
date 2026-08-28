import { Activity, Bell, CheckCircle2, Clock3, CopyCheck, Radio, ShieldAlert, XCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const instituteScope = session.user.instituteId ? { instituteId: session.user.instituteId } : {};
  const scanScope = session.user.instituteId ? { OR: [{ instituteId: session.user.instituteId }, { instituteId: null }] } : {};

  const [scans, queuePending, notificationSentCount, readers] = await Promise.all([
    prisma.scanRequestLog.findMany({
      where: { ...scanScope, receivedAt: { gte: since } },
      orderBy: { receivedAt: "desc" },
      take: 100
    }),
    prisma.notificationQueue.count({ where: { ...instituteScope, status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.notificationQueue.count({ where: { ...instituteScope, status: "SENT", processedAt: { gte: since } } }),
    prisma.readerDevice.findMany({ where: instituteScope, orderBy: [{ isActive: "desc" }, { lastSeenAt: "desc" }] })
  ]);

  const successCount = scans.filter((scan) => scan.result === "SUCCESS").length;
  const duplicateCount = scans.filter((scan) => scan.result === "DUPLICATE_ATTENDANCE").length;
  const failedCount = scans.filter((scan) => !["SUCCESS", "DUPLICATE_ATTENDANCE"].includes(scan.result)).length;
  const responseTimes = scans
    .filter((scan) => scan.processedAt)
    .map((scan) => Math.max(0, scan.processedAt!.getTime() - scan.receivedAt.getTime()));

  return (
    <div className="space-y-6">
      <section>
        <Badge variant="secondary">Production monitor</Badge>
        <h2 className="mt-3 text-3xl font-semibold">Live Scan Monitor</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          NFC and QR scan throughput, duplicate pressure, queue health, and registered reader status for the last hour.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Success" value={successCount} detail="Attendance saved" icon={CheckCircle2} />
        <Metric title="Duplicates" value={duplicateCount} detail="Already marked" icon={CopyCheck} />
        <Metric title="Failed" value={failedCount} detail="Invalid, inactive, or blocked" icon={XCircle} />
        <Metric title="Average response" value={`${avg(responseTimes)}ms`} detail="Processed scan latency" icon={Activity} />
        <Metric title="Queue pending" value={queuePending} detail="Notification jobs waiting" icon={Clock3} />
        <Metric title="Notifications sent" value={notificationSentCount} detail="Sent from DB queue" icon={Bell} />
        <Metric title="Readers" value={readers.length} detail={`${readers.filter((reader) => reader.isActive).length} active`} icon={Radio} />
        <Metric title="Health" value={failedCount > successCount ? "Watch" : "Good"} detail="Based on recent scans" icon={ShieldAlert} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scans.length ? (
              scans.slice(0, 30).map((scan) => (
                <div key={scan.id} className="grid gap-3 rounded-lg border bg-white/75 p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold">{scan.scannedValue}</p>
                    <p className="text-xs text-muted-foreground">
                      {scan.scanType} - {scan.deviceId} - {scan.receivedAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant={scan.result === "SUCCESS" ? "success" : scan.result === "DUPLICATE_ATTENDANCE" ? "warning" : "outline"}>{scan.result}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {scan.processedAt ? `${Math.max(0, scan.processedAt.getTime() - scan.receivedAt.getTime())}ms` : "processing"}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed bg-white/60 p-6 text-sm text-muted-foreground">No scan traffic in the last hour.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Reader health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readers.length ? (
              readers.map((reader) => (
                <div key={reader.id} className="rounded-lg border bg-white/75 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{reader.name}</p>
                    <Badge variant={reader.isActive ? "success" : "warning"}>{reader.isActive ? "active" : "inactive"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reader.deviceCode} - {reader.type} - {reader.location ?? "No location"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Last seen: {reader.lastSeenAt ? reader.lastSeenAt.toLocaleString() : "Never"}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed bg-white/60 p-6 text-sm text-muted-foreground">No reader devices registered yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: typeof Activity }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
