import Link from "next/link";
import { CreditCard, QrCode, Radio, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { instituteId } = await getTenantContext();
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status && params.status !== "ALL" ? params.status : undefined;

  const cards = await prisma.studentCard.findMany({
    where: {
      instituteId,
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { cardNumber: { contains: q } },
              { nfcUid: { contains: q } },
              { qrCode: { contains: q } },
              { qrToken: { contains: q } },
              { student: { firstName: { contains: q } } },
              { student: { lastName: { contains: q } } },
              { student: { admissionNo: { contains: q } } }
            ]
          }
        : {})
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
      _count: { select: { history: true, scanLogs: true } }
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  const activeCount = cards.filter((card) => card.status === "ACTIVE").length;
  const flaggedCount = cards.filter((card) => ["LOST", "MISSING", "STOLEN"].includes(card.status)).length;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Student card command</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Cards</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track NFC and QR assignments, active cards, replacement history, and suspicious scans across the institute.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Active cards" value={activeCount} />
            <Metric label="Lost / missing / stolen" value={flaggedCount} tone="warning" />
          </div>
        </div>
      </section>

      <Card className="glass-panel">
        <CardContent className="p-5">
          <form className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q ?? ""} placeholder="Search student, card number, NFC, or QR..." className="pl-9" />
            </div>
            <Select name="status" defaultValue={params.status ?? "ALL"} className="lg:w-52">
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="LOST">Lost</option>
              <option value="MISSING">Missing</option>
              <option value="STOLEN">Stolen</option>
              <option value="DAMAGED">Damaged</option>
              <option value="REPLACED">Replaced</option>
              <option value="BLOCKED">Blocked</option>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        {cards.length ? (
          cards.map((card) => (
            <Link key={card.id} href={`/cards/${card.id}`} className="group block">
              <Card className="glass-panel transition group-hover:-translate-y-0.5 group-hover:shadow-luxury">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant={card.status === "ACTIVE" ? "success" : ["LOST", "STOLEN", "MISSING"].includes(card.status) ? "warning" : "outline"}>
                        {card.status.toLowerCase()}
                      </Badge>
                      <h3 className="mt-3 text-xl font-semibold">{card.cardNumber ?? "Unnumbered card"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {card.student.firstName} {card.student.lastName} - {card.student.admissionNo}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Info icon={Radio} label="NFC UID" value={card.nfcUid ?? "Not set"} />
                    <Info icon={QrCode} label="QR token" value={card.qrToken ?? card.qrCode ?? "Not set"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{card._count.history} history events</span>
                    <span>{card._count.scanLogs} scan logs</span>
                    <span>Issued {card.issuedAt.toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="glass-panel xl:col-span-2">
            <CardContent className="p-10 text-center">
              <p className="font-semibold">No cards found</p>
              <p className="mt-2 text-sm text-muted-foreground">Assign a card from a student profile or adjust the filters.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div className={`rounded-xl border bg-white/75 p-4 ${tone === "warning" ? "border-amber-200" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-white/70 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
