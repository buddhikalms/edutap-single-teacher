import { CheckCircle2, CreditCard, GraduationCap, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

const invalidStatuses = new Set(["LOST", "STOLEN", "MISSING", "DAMAGED", "REPLACED", "INACTIVE"]);

export default async function VerifyStudentCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await prisma.studentCard.findFirst({
    where: { qrToken: token },
    select: {
      cardNumber: true,
      status: true,
      issuedAt: true,
      institute: { select: { name: true } },
      student: {
        select: {
          firstName: true,
          lastName: true,
          admissionNo: true,
          status: true
        }
      }
    }
  });

  const isValid = Boolean(card && card.status === "ACTIVE" && card.student.status === "ACTIVE");
  const isPending = Boolean(card && card.status === "PRINT_PENDING");
  const isInvalid = Boolean(card && invalidStatuses.has(card.status));
  const studentName = card ? `${card.student.firstName} ${card.student.lastName}`.trim() : "";
  const initials = studentName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="bg-[radial-gradient(circle_at_top,rgba(212,157,50,.16),transparent_28%),linear-gradient(180deg,#071a32_0%,#0b294b_48%,#f8fafc_48%)] px-4 py-16">
      <div className="mx-auto max-w-lg">
        <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl">
          <div className="bg-[#082342] px-7 py-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-b-3xl rounded-t-lg border-2 border-[#d6a33f] bg-[#0d3158]">
              <GraduationCap className="h-8 w-8 text-[#e0ad49]" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#e0ad49]">EduTap smart card</p>
            <h1 className="mt-2 text-2xl font-semibold">Card verification</h1>
          </div>

          <div className="p-7 sm:p-9">
            <div className={`rounded-2xl border p-5 ${isValid ? "border-emerald-200 bg-emerald-50" : isPending ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-start gap-3">
                {isValid ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /> : <ShieldAlert className={`mt-0.5 h-6 w-6 shrink-0 ${isPending ? "text-amber-600" : "text-red-600"}`} />}
                <div>
                  <h2 className="font-semibold">
                    {isValid ? "Valid student card" : isPending ? "Card awaiting activation" : isInvalid ? "Card is no longer valid" : "Card could not be verified"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {isValid
                      ? "This secure QR belongs to an active student card."
                      : isPending
                        ? "The card was created but has not been activated by the institute yet."
                        : "Do not use this card for identity or attendance."}
                  </p>
                </div>
              </div>
            </div>

            {card ? (
              <div className="mt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#082342] text-lg font-bold text-white">{initials}</div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold">{studentName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.institute.name}</p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm">
                  <Detail label="Student ID" value={card.student.admissionNo} />
                  <Detail label="Card number" value={card.cardNumber ?? "Not assigned"} />
                  <Detail label="Issued" value={card.issuedAt.toLocaleDateString()} />
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd><Badge variant={isValid ? "success" : isPending ? "warning" : "outline"}>{card.status.toLowerCase().replaceAll("_", " ")}</Badge></dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {isValid ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <CreditCard className="h-4 w-4" />}
              Verification performed securely by EduTap
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}
