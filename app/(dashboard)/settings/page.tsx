import { Settings2 } from "lucide-react";
import { InstituteSettingsForm } from "@/components/settings/institute-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function SettingsPage() {
  const { instituteId, role } = await getTenantContext();
  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    include: {
      settings: true,
      branches: { orderBy: { createdAt: "asc" } },
      subscription: true
    }
  });

  if (!institute) {
    return null;
  }

  const settings = institute.settings ?? {
    receiptPrefix: "RCT",
    receiptFooter: null,
    paymentDueDay: 10,
    attendanceLateAfterMins: 15,
    attendanceAutoAbsent: false,
    currency: "USD",
    themeColor: "#0f766e",
    logoPlaceholder: null
  };

  const canEdit = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Institute settings</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Brand, billing rules, and operations</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Configure the profile details and operating rules that appear across receipts, attendance, payments, and branches.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white shadow-glow">
            <Settings2 className="h-6 w-6" />
          </div>
        </div>
      </section>

      {!canEdit ? (
        <Card className="glass-panel">
          <CardContent className="p-8 text-center">
            <p className="font-semibold">Settings are read-only for your role.</p>
            <p className="mt-2 text-sm text-muted-foreground">Ask an institute administrator to update profile and policy settings.</p>
          </CardContent>
        </Card>
      ) : (
        <InstituteSettingsForm institute={institute} settings={settings} branches={institute.branches} />
      )}
    </div>
  );
}
