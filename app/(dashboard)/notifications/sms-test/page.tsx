import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { SmsTestForm } from "@/components/notifications/sms-test-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccess } from "@/lib/rbac";
import { getTenantContext } from "@/lib/session";
import { getSmsLenzConfig } from "@/lib/smslenz-sms";
import { prisma } from "@/lib/prisma";

export default async function SmsTestPage() {
  const context = await getTenantContext();

  if (!canAccess(context.role, "notifications")) {
    redirect("/dashboard");
  }

  const config = getSmsLenzConfig();
  const logs = await prisma.notificationLog.findMany({
    where: { instituteId: context.instituteId, channel: "SMS" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, status: true, target: true, errorMessage: true, createdAt: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-3">
            <Link href="/notifications">
              <ArrowLeft className="h-4 w-4" />
              Notifications
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-foreground">SMS Gateway Test</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Send a direct SMSLenz test message and confirm delivery logging before enabling attendance SMS.
          </p>
        </div>
        <Badge variant={config.ok ? "success" : "warning"}>{config.ok ? "SMSLenz configured" : "Setup needed"}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="border-b bg-white/70">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Send test message</CardTitle>
                <CardDescription>
                  Recipient numbers are normalized to 9476XXXXXXX format before sending.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!config.ok ? (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {config.reason}
              </div>
            ) : null}
            <SmsTestForm disabled={!config.ok} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent SMS logs</CardTitle>
            <CardDescription>Latest SMS sends from attendance and test messages.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{log.title}</p>
                    <Badge variant={log.status === "SENT" ? "success" : log.status === "FAILED" ? "warning" : "outline"}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{log.target ?? "No target"}</p>
                  {log.errorMessage ? <p className="mt-2 text-xs text-destructive">{log.errorMessage}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">{log.createdAt.toLocaleString()}</p>
                </div>
              ))}

              {logs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No SMS logs yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
