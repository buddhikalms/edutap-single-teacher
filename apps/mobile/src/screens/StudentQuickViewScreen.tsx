import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getStudentProfile } from "@/api/mobile";
import { MetricCard } from "@/components/MetricCard";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { StudentProfileResponse } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "StudentQuickView">;

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function StudentQuickViewScreen({ route }: Props) {
  const { studentId } = route.params;
  const [data, setData] = useState<StudentProfileResponse["student"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getStudentProfile(studentId);
      setData(response.student);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load student.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenShell title={data?.name ?? "Student"} eyebrow={data?.admissionNo ?? "Quick view"}>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data ? (
        <>
          <PremiumCard>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{data.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{data.name}</Text>
                <Text style={styles.meta}>{data.branchName} · {data.status.toLowerCase()}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <StatusPill label={data.payment.label} value={data.payment.status} />
                  {data.nfcUid ? <StatusPill label="NFC linked" value="active" /> : <StatusPill label="No NFC" value="pending" />}
                </View>
              </View>
            </View>
          </PremiumCard>

          <View style={styles.metrics}>
            <MetricCard label="Present" value={String(data.attendanceSummary.present)} icon="checkmark-circle" tone={colors.emerald} />
            <MetricCard label="Late" value={String(data.attendanceSummary.late)} icon="time" tone={colors.amber} />
            <MetricCard label="Due balance" value={money(data.payment.amountDue)} icon="wallet" tone={colors.violet} />
            <MetricCard label="Classes" value={String(data.classes.length)} icon="school" tone={colors.blue} />
          </View>

          <PremiumCard>
            <Text style={styles.title}>Assigned classes</Text>
            {data.classes.map((classGroup) => (
              <View key={classGroup.id} style={styles.lineRow}>
                <Ionicons name="albums" color={colors.blue} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{classGroup.name}</Text>
                  <Text style={styles.meta}>{classGroup.courseName} · {classGroup.schedule}</Text>
                </View>
                <StatusPill label={classGroup.active ? "Active" : "Inactive"} value={classGroup.active ? "active" : "pending"} />
              </View>
            ))}
          </PremiumCard>

          <PremiumCard>
            <Text style={styles.title}>Attendance history</Text>
            {data.attendanceHistory.length === 0 ? <Text style={styles.meta}>No attendance records yet.</Text> : null}
            {data.attendanceHistory.slice(0, 8).map((record) => (
              <View key={record.id} style={styles.lineRow}>
                <Ionicons name="calendar" color={colors.inkMuted} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{record.classGroup.name}</Text>
                  <Text style={styles.meta}>{new Date(record.sessionDate).toLocaleDateString()} · {record.source}</Text>
                </View>
                <StatusPill value={record.status.toLowerCase()} />
              </View>
            ))}
          </PremiumCard>

          <PremiumCard>
            <Text style={styles.title}>Payment history</Text>
            {data.payments.length === 0 ? <Text style={styles.meta}>No payment records yet.</Text> : null}
            {data.payments.slice(0, 6).map((payment) => (
              <View key={payment.id} style={styles.lineRow}>
                <Ionicons name="receipt" color={colors.gold} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{payment.invoiceNo}</Text>
                  <Text style={styles.meta}>{payment.month ?? payment.type} · paid {money(payment.paidAmount)}</Text>
                </View>
                <StatusPill value={payment.status.toLowerCase()} />
              </View>
            ))}
          </PremiumCard>
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.gold, fontSize: 26, fontWeight: "900" },
  name: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  meta: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  lineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  error: { color: colors.red, fontWeight: "800" }
});
