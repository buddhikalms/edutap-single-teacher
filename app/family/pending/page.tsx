import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { signOut } from "@/app/family/pending/sign-out";
import { PaymentSlipResubmitForm } from "@/components/payments/payment-slip-resubmit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authOptions, PENDING_ACCOUNT_MESSAGE, REJECTED_ACCOUNT_MESSAGE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FamilyPendingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "FAMILY") redirect("/family/login");
  const [user, enrollment] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { accountStatus: true } }),
    prisma.enrollmentRequest.findFirst({
      where: { familyUserId: session.user.id },
      include: { classGroup: true, paymentSlip: { include: { payment: { include: { receipts: true } } } } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  if (user?.accountStatus === "ACTIVE") redirect("/family/dashboard");
  const rejected = user?.accountStatus === "REJECTED";
  const slip = enrollment?.paymentSlip;
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="w-full max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-xl">
    <p className={`text-sm font-semibold ${rejected ? "text-rose-700" : "text-amber-700"}`}>{rejected ? "Request not approved" : "Approval pending"}</p>
    <h1 className="mt-3 text-2xl font-semibold">{rejected ? REJECTED_ACCOUNT_MESSAGE : PENDING_ACCOUNT_MESSAGE}</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Signed in as {session.user.email || session.user.name}. Dashboard access remains protected until the account is active.</p>
    {enrollment ? <div className="mt-6 rounded-2xl border bg-slate-50 p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground">Requested class</p><p className="font-semibold">{enrollment.classGroup.name}</p></div><Badge variant={enrollment.status === "REJECTED" ? "outline" : "warning"}>{enrollment.status}</Badge></div>
      {slip ? <div className="mt-4 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground">Payment slip</p><p className="font-semibold">{slip.fileName}</p></div><Badge variant={slip.status === "VERIFIED" ? "success" : slip.status === "REJECTED" ? "outline" : "warning"}>{slip.status.replaceAll("_", " ")}</Badge></div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p><span className="text-muted-foreground">Amount:</span> {Number(slip.paidAmount).toLocaleString()}</p><p><span className="text-muted-foreground">Paid:</span> {slip.paymentDate.toISOString().slice(0, 10)}</p></div>
        <Button asChild variant="outline" size="sm" className="mt-3"><a href={`${slip.fileUrl}?download=1`}>Download uploaded slip</a></Button>
        {slip.teacherNote ? <p className="mt-3 rounded-xl bg-white p-3 text-sm"><span className="font-semibold">Teacher note:</span> {slip.teacherNote}</p> : null}
        {slip.status === "REJECTED" && enrollment.status !== "REJECTED" ? <PaymentSlipResubmitForm enrollmentRequestId={enrollment.id} paidAmount={Number(slip.paidAmount)} paymentMethod={slip.paymentMethod} paymentDate={slip.paymentDate.toISOString().slice(0, 10)} referenceNumber={slip.referenceNumber || ""} /> : null}
      </div> : <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">No payment slip was submitted with this request.</p>}
    </div> : null}
    <form action={signOut}><Button type="submit" variant="outline" className="mt-6">Sign out</Button></form>
  </div></main>;
}
