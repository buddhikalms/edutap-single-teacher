import { Check, CreditCard, Crown, Gauge, MessageSquareText, UsersRound } from "lucide-react";
import { SubscriptionPlan } from "@prisma/client";
import { changeSubscriptionPlan } from "@/app/(dashboard)/billing/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { getPlanDefinition, planDefinitions } from "@/lib/subscription-plans";
import { formatCurrency } from "@/lib/utils";

function percent(used: number, limit: number) {
  if (!limit) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

function formatDate(date: Date | null | undefined) {
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
      })
    : "Not scheduled";
}

export default async function BillingPage() {
  const { instituteId } = await getTenantContext();

  const [subscription, students, teachers, branches] = await Promise.all([
    prisma.instituteSubscription.findUnique({ where: { instituteId } }),
    prisma.student.count({ where: { instituteId } }),
    prisma.teacher.count({ where: { instituteId } }),
    prisma.branch.count({ where: { instituteId } })
  ]);

  const currentPlan = getPlanDefinition(subscription?.plan ?? SubscriptionPlan.SMALL_INSTITUTE);
  const limits = {
    Students: { used: students, limit: subscription?.studentLimit ?? currentPlan.studentLimit, icon: UsersRound },
    Teachers: { used: teachers, limit: subscription?.teacherLimit ?? currentPlan.teacherLimit, icon: Crown },
    Branches: { used: branches, limit: subscription?.branchLimit ?? currentPlan.branchLimit, icon: Gauge },
    "SMS credits": { used: 0, limit: subscription?.smsCredits ?? currentPlan.smsCredits, icon: MessageSquareText }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">SaaS subscription</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Billing and plan control</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage institute subscription status, limits, SMS allocation, and plan upgrades from one billing workspace.
            </p>
          </div>
          <div className="rounded-xl border bg-white/75 p-4 text-right">
            <p className="text-xs text-muted-foreground">Current plan</p>
            <p className="mt-1 text-2xl font-semibold">{currentPlan.name}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-white/75 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="mt-1 text-2xl font-semibold">{subscription?.status ?? "TRIAL"}</p>
                </div>
                <Badge variant={subscription?.status === "ACTIVE" ? "success" : "warning"}>{formatCurrency(subscription?.monthlyPrice?.toString() ?? currentPlan.price)} / month</Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Next renewal: {formatDate(subscription?.currentPeriodEnd)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(limits).map(([label, item]) => {
                const Icon = item.icon;
                const usage = percent(item.used, item.limit);
                return (
                  <div key={label} className="rounded-xl border bg-white/75 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">{label}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.used}/{item.limit}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${usage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Upgrade plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {planDefinitions.map((plan) => {
              const isCurrent = subscription?.plan === plan.id;
              return (
                <form key={plan.id} action={changeSubscriptionPlan} className={`rounded-xl border bg-white/78 p-5 ${plan.featured ? "ring-2 ring-amber-300" : ""}`}>
                  <input type="hidden" name="plan" value={plan.id} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.summary}</p>
                    </div>
                    {plan.featured ? <Badge variant="warning">Popular</Badge> : null}
                  </div>
                  <p className="mt-5 text-3xl font-semibold">{formatCurrency(plan.price)}</p>
                  <p className="text-xs text-muted-foreground">per institute / month</p>
                  <div className="mt-5 space-y-2 text-sm">
                    <PlanLine label={`${plan.studentLimit} students`} />
                    <PlanLine label={`${plan.teacherLimit} teachers`} />
                    <PlanLine label={`${plan.branchLimit} branches`} />
                    <PlanLine label={`${plan.smsCredits} SMS credits`} />
                  </div>
                  <Button className="mt-6 w-full" type="submit" variant={isCurrent ? "outline" : "default"} disabled={isCurrent}>
                    {isCurrent ? "Current plan" : "Upgrade"}
                  </Button>
                </form>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PlanLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-teal-700" />
      <span>{label}</span>
    </div>
  );
}
