import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, QrCode, Radio } from "lucide-react";
import { StudentCardActions } from "@/components/cards/student-card-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function StudentCardsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { studentId } = await params;

  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        branch: true,
        cards: {
          include: {
            history: { orderBy: { performedAt: "desc" }, take: 5 },
            scanLogs: { orderBy: { scannedAt: "desc" }, take: 5 }
          },
          orderBy: [{ status: "asc" }, { issuedAt: "desc" }]
        }
      }
    }),
    prisma.instituteSettings.findUnique({
      where: { instituteId },
      select: { cardReplacementFee: true }
    })
  ]);

  if (!student) {
    notFound();
  }

  const activeCard = student.cards.find((card) => card.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Student profile
            </Link>
          </Button>
          <h2 className="mt-4 text-3xl font-semibold">{student.firstName} {student.lastName} cards</h2>
          <p className="mt-2 text-sm text-muted-foreground">{student.admissionNo} - {student.branch.name}</p>
        </div>
        <StudentCardActions
          studentId={student.id}
          activeCard={activeCard ? { id: activeCard.id, status: activeCard.status } : null}
          replacementFee={settings?.cardReplacementFee ? Number(settings.cardReplacementFee) : null}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Current active card</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCard ? (
              <Link href={`/cards/${activeCard.id}`} className="block rounded-2xl border bg-white/80 p-5 transition hover:bg-muted/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="success">active</Badge>
                    <h3 className="mt-3 text-2xl font-semibold">{activeCard.cardNumber ?? "Unnumbered card"}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Issued {activeCard.issuedAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <Info icon={Radio} label="NFC UID" value={activeCard.nfcUid ?? "Not assigned"} />
                  <Info icon={QrCode} label="QR token" value={activeCard.qrToken ?? activeCard.qrCode ?? "Not assigned"} />
                </div>
              </Link>
            ) : (
              <Empty text="No active card is assigned. Issue a new card to enable NFC/QR attendance." />
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Card history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.cards.length ? (
              student.cards.map((card) => (
                <Link key={card.id} href={`/cards/${card.id}`} className="block rounded-xl border bg-white/75 p-4 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={card.status === "ACTIVE" ? "success" : ["LOST", "STOLEN", "MISSING"].includes(card.status) ? "warning" : "outline"}>
                        {card.status.toLowerCase()}
                      </Badge>
                      <p className="mt-2 font-semibold">{card.cardNumber ?? "Unnumbered card"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {card.nfcUid ?? "No NFC"} - {card.qrToken ?? card.qrCode ?? "No QR"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{card.issuedAt.toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty text="No cards have been assigned to this student." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Latest timeline events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.cards.flatMap((card) => card.history.map((event) => ({ ...event, cardNumber: card.cardNumber }))).length ? (
              student.cards
                .flatMap((card) => card.history.map((event) => ({ ...event, cardNumber: card.cardNumber })))
                .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
                .slice(0, 8)
                .map((event) => (
                  <div key={event.id} className="rounded-xl border bg-white/75 p-4">
                    <p className="font-semibold">{event.action.replaceAll("_", " ").toLowerCase()}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.cardNumber ?? "Card"} - {event.previousStatus ?? "none"} to {event.newStatus ?? "none"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{event.performedAt.toLocaleString()}</p>
                  </div>
                ))
            ) : (
              <Empty text="No timeline events yet." />
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.cards.flatMap((card) => card.scanLogs.map((log) => ({ ...log, cardNumber: card.cardNumber }))).length ? (
              student.cards
                .flatMap((card) => card.scanLogs.map((log) => ({ ...log, cardNumber: card.cardNumber })))
                .sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime())
                .slice(0, 8)
                .map((log) => (
                  <div key={log.id} className="rounded-xl border bg-white/75 p-4">
                    <Badge variant={log.result === "SUCCESS" ? "success" : log.result.includes("LOST") || log.result.includes("STOLEN") ? "warning" : "outline"}>
                      {log.result.toLowerCase()}
                    </Badge>
                    <p className="mt-2 text-sm font-semibold">{log.scanType} - {log.cardNumber ?? "Card"}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{log.scannedValue}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{log.scannedAt.toLocaleString()}</p>
                  </div>
                ))
            ) : (
              <Empty text="No card scans have been logged for this student." />
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

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
