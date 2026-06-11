import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { Activity, Building2, CreditCard, DollarSign } from "lucide-react";
import { toggleInstituteStatus } from "@/app/(dashboard)/admin/actions";
import { RevenueOverviewChart } from "@/components/admin/admin-charts";
import { ReportMetricCard } from "@/components/reports/report-metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanDefinition } from "@/lib/subscription-plans";
import { formatCurrency } from "@/lib/utils";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const [institutes, totalStudents, totalTeachers, totalPayments] = await Promise.all([
    prisma.institute.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            branches: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { paidAmount: true },
      _count: { _all: true }
    })
  ]);

  const activeInstitutes = institutes.filter((item) => item.active).length;
  const monthlyRecurringRevenue = institutes.reduce((total, institute) => {
    if (institute.subscription?.status !== "ACTIVE") {
      return total;
    }

    return total + Number(institute.subscription.monthlyPrice);
  }, 0);

  const revenueByPlan = Array.from(
    institutes.reduce((map, institute) => {
      if (!institute.subscription) {
        return map;
      }

      const plan = getPlanDefinition(institute.subscription.plan);
      const existing = map.get(plan.name) ?? { plan: plan.name.replace(" Plan", ""), revenue: 0, institutes: 0 };
      existing.revenue += institute.subscription.status === "ACTIVE" ? Number(institute.subscription.monthlyPrice) : 0;
      existing.institutes += 1;
      map.set(plan.name, existing);
      return map;
    }, new Map<string, { plan: string; revenue: number; institutes: number }>())
  ).map(([, value]) => value);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Super admin</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Platform command center</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor all institutes, subscription health, platform revenue, and operating scale from one administrative view.
            </p>
          </div>
          <div className="rounded-xl border bg-white/75 p-4 text-right">
            <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(monthlyRecurringRevenue)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetricCard title="Institutes" value={String(institutes.length)} helper={`${activeInstitutes} active, ${institutes.length - activeInstitutes} inactive`} icon={Building2} />
        <ReportMetricCard title="Subscriptions" value={String(institutes.filter((item) => item.subscription).length)} helper="Tracked plan records across tenants" icon={CreditCard} />
        <ReportMetricCard title="Platform revenue" value={formatCurrency(totalPayments._sum.paidAmount?.toString() ?? 0)} helper={`${totalPayments._count._all} paid invoices recorded`} icon={DollarSign} />
        <ReportMetricCard title="System stats" value={`${totalStudents}/${totalTeachers}`} helper="Students / teachers across all institutes" icon={Activity} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <RevenueOverviewChart data={revenueByPlan} />
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Subscription mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {institutes.map((institute) => {
              const plan = institute.subscription ? getPlanDefinition(institute.subscription.plan) : null;
              return (
                <div key={institute.id} className="flex items-center justify-between gap-4 rounded-xl border bg-white/75 p-4">
                  <div>
                    <p className="font-semibold">{institute.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan?.name ?? "No plan"}</p>
                  </div>
                  <Badge variant={institute.subscription?.status === "ACTIVE" ? "success" : "warning"}>{institute.subscription?.status ?? "NONE"}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>All institutes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-white/75">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Institute</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-right">Teachers</th>
                  <th className="px-4 py-3 text-right">Branches</th>
                  <th className="px-4 py-3 text-right">MRR</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {institutes.map((institute) => {
                  const plan = institute.subscription ? getPlanDefinition(institute.subscription.plan) : null;
                  return (
                    <tr key={institute.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{institute.name}</p>
                        <p className="text-xs text-muted-foreground">{institute.email}</p>
                      </td>
                      <td className="px-4 py-3">{plan?.name ?? "No subscription"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Badge variant={institute.active ? "success" : "warning"}>{institute.active ? "ACTIVE" : "INACTIVE"}</Badge>
                          <Badge variant="outline">{institute.subscription?.status ?? "NONE"}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{institute._count.students}</td>
                      <td className="px-4 py-3 text-right">{institute._count.teachers}</td>
                      <td className="px-4 py-3 text-right">{institute._count.branches}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(institute.subscription?.monthlyPrice?.toString() ?? 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={toggleInstituteStatus}>
                          <input type="hidden" name="instituteId" value={institute.id} />
                          <input type="hidden" name="active" value={String(!institute.active)} />
                          <Button type="submit" variant="outline" size="sm">
                            {institute.active ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
