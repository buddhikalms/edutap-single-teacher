import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getProfile } from "@/api/student";
import { PremiumCard } from "@/components/PremiumCard";
import { QrCodeView } from "@/components/QrCodeView";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/theme/colors";
import type { StudentProfile } from "@/types/api";

export function ProfileScreen() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    getProfile()
      .then((res) => {
        if (mounted) setStudent(res.student);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const qrValue = useMemo(() => {
    const value = student?.qrCode || student?.admissionNo || student?.id;
    return value?.trim() || "edutap-student";
  }, [student]);

  if (!student && !failed) {
    return (
      <ScreenShell title="Profile" eyebrow="Student ID">
        <ActivityIndicator color={colors.gold} />
      </ScreenShell>
    );
  }

  if (failed || !student) {
    return (
      <ScreenShell title="Profile" eyebrow="Student ID">
        <PremiumCard>
          <Text style={styles.title}>Profile unavailable</Text>
          <Text style={styles.meta}>Please check your connection and open this page again.</Text>
        </PremiumCard>
      </ScreenShell>
    );
  }

  const parentList = student.parents ?? [];

  return (
    <ScreenShell title="Profile" eyebrow={student.institute?.name ?? "Student ID"}>
      <PremiumCard style={styles.identityCard}>
        <View style={styles.qrWrap}>
          <QrCodeView value={qrValue} size={156} backgroundColor="#ffffff" color={colors.ink} />
        </View>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.meta}>{[student.admissionNo, student.branch?.name].filter(Boolean).join(" | ")}</Text>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.title}>Student details</Text>
        <InfoRow label="Status" value={student.status ?? "Active"} />
        <InfoRow label="Phone" value={student.phone ?? "Not added"} />
        <InfoRow label="Email" value={student.email ?? "Not added"} />
        <InfoRow label="Branch" value={student.branch?.name ?? "Main branch"} />
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.title}>Parent details</Text>
        {parentList.length ? (
          parentList.map((parent) => (
            <View key={parent.id} style={styles.parentRow}>
              <Text style={styles.parentName}>{parent.name}</Text>
              <Text style={styles.meta}>{[parent.phone, parent.email].filter(Boolean).join(" | ") || "Contact not added"}</Text>
              {parent.occupation ? <Text style={styles.smallMeta}>{parent.occupation}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No parent details have been added yet.</Text>
        )}
      </PremiumCard>
    </ScreenShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identityCard: { alignItems: "center" },
  qrWrap: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  name: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 16, textAlign: "center" },
  title: { color: colors.text, fontWeight: "900", fontSize: 18, marginBottom: 8 },
  meta: { color: colors.muted, marginTop: 6, fontWeight: "700", textAlign: "center" },
  smallMeta: { color: colors.muted, marginTop: 4, fontWeight: "600" },
  infoRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  label: { color: colors.muted, fontWeight: "800", flex: 1 },
  value: { color: colors.text, fontWeight: "900", flex: 1.4, textAlign: "right" },
  parentRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  parentName: { color: colors.text, fontSize: 16, fontWeight: "900" }
});
