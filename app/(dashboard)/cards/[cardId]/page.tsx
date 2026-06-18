import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CreditCard, QrCode, Radio, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function CardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { cardId } = await params;

  const card = await prisma.studentCard.findFirst({
    where: { id: cardId, instituteId },
    include: {
      student: { include: { branch: true } },
      issuedBy: { select: { name: true } },
      replacedBy: { select: { name: true } },
      history: {
        include: { performedBy: { select: { name: true } } },
        orderBy: { performedAt: "desc" }
      },
      scanLogs: {
        include: {
          classGroup: { select: { name: true } },
          scannedBy: { select: { name: true } }
        },
        orderBy: { scannedAt: "desc" },
        take: 20
      }
    }
  });

  if (!card) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/cards">
              <ArrowLeft className="h-4 w-4" />
              Cards
            </Link>
          </Button>
          <h2 className="mt-4 text-3xl font-semibold">{card.cardNumber ?? "Student card"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Linked to {card.student.firstName} {card.student.lastName} - {card.student.admissionNo}
          </p>
        </div>
        <Badge variant={card.status === "ACTIVE" ? "success" : ["LOST", "STOLEN", "MISSING"].includes(card.status) ? "warning" : "outline"}>
          {card.status.toLowerCase()}
        </Badge>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="rounded-2xl border bg-white/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary">EduTap smart card</Badge>
                  <h3 className="mt-4 text-2xl font-semibold">{card.cardNumber ?? "No card number"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">NFC + QR attendance credential</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <Info icon={Radio} label="NFC UID" value={card.nfcUid ?? "Not assigned"} />
                <Info icon={QrCode} label="QR code" value={card.qrCode ?? "Not assigned"} />
                <Info icon={QrCode} label="QR token" value={card.qrToken ?? "Not assigned"} />
                <Info icon={CalendarDays} label="Issued" value={card.issuedAt.toLocaleString()} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Linked student</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/students/${card.student.id}`} className="flex items-center gap-4 rounded-xl border bg-white/75 p-4 transition hover:bg-muted/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{card.student.firstName} {card.student.lastName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.student.admissionNo} - {card.student.branch.name}</p>
              </div>
            </Link>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Small label="Issued by" value={card.issuedBy?.name ?? "Not recorded"} />
              <Small label="Replaced by" value={card.replacedBy?.name ?? "Not replaced"} />
              <Small label="Activated" value={card.activatedAt?.toLocaleString() ?? "Not recorded"} />
              <Small label="Deactivated" value={card.deactivatedAt?.toLocaleString() ?? "Active"} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>History timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {card.history.length ? (
              card.history.map((event) => (
                <div key={event.id} className="rounded-xl border bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{event.action.replaceAll("_", " ").toLowerCase()}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.previousStatus ?? "none"} to {event.newStatus ?? "none"} by {event.performedBy?.name ?? "System"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{event.performedAt.toLocaleString()}</span>
                  </div>
                  {event.reason || event.notes ? <p className="mt-3 text-sm text-muted-foreground">{event.reason ?? event.notes}</p> : null}
                </div>
              ))
            ) : (
              <Empty text="No history events recorded." />
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent scan logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {card.scanLogs.length ? (
              card.scanLogs.map((log) => (
                <div key={log.id} className="rounded-xl border bg-white/75 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={log.result === "SUCCESS" ? "success" : log.result.includes("LOST") || log.result.includes("STOLEN") ? "warning" : "outline"}>
                        {log.result.toLowerCase()}
                      </Badge>
                      <p className="mt-2 text-sm font-semibold">{log.scanType} scan</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{log.scannedValue}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.scannedAt.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{log.classGroup?.name ?? "No class"} - {log.scannedBy?.name ?? "Scanner"}</p>
                </div>
              ))
            ) : (
              <Empty text="No scan logs for this card yet." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold">{value}</p>
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
