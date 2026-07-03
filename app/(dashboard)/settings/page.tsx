import { Settings2 } from "lucide-react";
import { InstituteSettingsForm } from "@/components/settings/institute-settings-form";
import { TeachingLocationsManager, type TeachingLocationRow } from "@/components/settings/teaching-locations-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function SettingsPage() {
  const { instituteId, role } = await getTenantContext();
  const [institute, teacher] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: instituteId },
      include: {
        settings: true,
        branches: {
          include: { _count: { select: { classGroups: true, students: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    }),
    prisma.teacher.findFirst({ where: { instituteId, userId: { not: null } }, orderBy: { createdAt: "asc" } })
  ]);

  if (!institute || !teacher) {
    return null;
  }

  const settings = institute.settings ?? {
    receiptPrefix: "RCT",
    receiptFooter: null,
    paymentDueDay: 10,
    attendanceLateAfterMins: 15,
    attendanceAutoAbsent: false,
    attendanceParentArrivalNotificationEnabled: true,
    attendanceParentIncludePaymentSummary: true,
    attendanceParentIncludeOverdueAmount: true,
    attendanceParentSendOncePerSession: true,
    attendanceParentSendOnPresent: true,
    attendanceParentSendOnLate: true,
    attendanceParentMessageTemplate: null,
    notificationMobilePushEnabled: true,
    notificationWebPushEnabled: true,
    notificationInAppEnabled: true,
    notificationIncludeDueDates: true,
    cardRequireDuringRegistration: false,
    cardRequireBothNfcAndQr: false,
    cardAllowQrOnly: true,
    cardAllowNfcOnly: true,
    cardAutoGenerateQrToken: true,
    cardReplacementFee: null,
    cardNotifyParentOnReplacement: false,
    cardNotifyAdminOnLostOrStolenScan: true,
    classEndedNotificationEnabled: true,
    classEndedIncludePaymentSummary: true,
    classEndedSendToPresent: true,
    classEndedSendToLate: true,
    classEndedSendToAbsent: false,
    classEndedMessageTemplate: null,
    currency: "USD",
    themeColor: "#0f766e",
    logoPlaceholder: null
  };

  const canEdit = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role);
  const formInstitute = {
    name: institute.name,
    email: institute.email,
    phone: institute.phone,
    address: institute.address,
    logoUrl: institute.logoUrl
  };
  const formTeacher = {
    name: teacher.name,
    specialty: teacher.specialty,
    bio: teacher.bio,
    photoUrl: teacher.photoUrl
  };
  const formSettings = {
    receiptPrefix: settings.receiptPrefix,
    receiptFooter: settings.receiptFooter,
    paymentDueDay: settings.paymentDueDay,
    attendanceLateAfterMins: settings.attendanceLateAfterMins,
    attendanceAutoAbsent: settings.attendanceAutoAbsent,
    attendanceParentArrivalNotificationEnabled: settings.attendanceParentArrivalNotificationEnabled,
    attendanceParentIncludePaymentSummary: settings.attendanceParentIncludePaymentSummary,
    attendanceParentIncludeOverdueAmount: settings.attendanceParentIncludeOverdueAmount,
    attendanceParentSendOncePerSession: settings.attendanceParentSendOncePerSession,
    attendanceParentSendOnPresent: settings.attendanceParentSendOnPresent,
    attendanceParentSendOnLate: settings.attendanceParentSendOnLate,
    attendanceParentMessageTemplate: settings.attendanceParentMessageTemplate,
    classEndedNotificationEnabled: settings.classEndedNotificationEnabled,
    classEndedIncludePaymentSummary: settings.classEndedIncludePaymentSummary,
    classEndedSendToPresent: settings.classEndedSendToPresent,
    classEndedSendToLate: settings.classEndedSendToLate,
    classEndedSendToAbsent: settings.classEndedSendToAbsent,
    classEndedMessageTemplate: settings.classEndedMessageTemplate,
    notificationMobilePushEnabled: settings.notificationMobilePushEnabled,
    notificationWebPushEnabled: settings.notificationWebPushEnabled,
    notificationInAppEnabled: settings.notificationInAppEnabled,
    notificationIncludeDueDates: settings.notificationIncludeDueDates,
    cardRequireDuringRegistration: settings.cardRequireDuringRegistration,
    cardRequireBothNfcAndQr: settings.cardRequireBothNfcAndQr,
    cardAllowQrOnly: settings.cardAllowQrOnly,
    cardAllowNfcOnly: settings.cardAllowNfcOnly,
    cardAutoGenerateQrToken: settings.cardAutoGenerateQrToken,
    cardReplacementFee: settings.cardReplacementFee === null ? null : Number(settings.cardReplacementFee),
    cardNotifyParentOnReplacement: settings.cardNotifyParentOnReplacement,
    cardNotifyAdminOnLostOrStolenScan: settings.cardNotifyAdminOnLostOrStolenScan,
    currency: settings.currency,
    themeColor: settings.themeColor,
    logoPlaceholder: settings.logoPlaceholder
  };
  const locations: TeachingLocationRow[] = institute.branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    location: branch.location,
    phone: branch.phone,
    address: branch.address,
    isActive: branch.isActive,
    classes: branch._count.classGroups,
    students: branch._count.students
  }));

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Teacher settings</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Your profile, brand, and teaching operations</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage the public teacher profile and the rules used across receipts, attendance, payments, cards, and notifications.
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
        <div className="space-y-5">
          <TeachingLocationsManager locations={locations} />
          <InstituteSettingsForm institute={formInstitute} teacher={formTeacher} settings={formSettings} />
        </div>
      )}
    </div>
  );
}
