import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getBootstrap } from "@/api/mobile";
import { useAuth } from "@/auth/AuthContext";
import { MetricCard } from "@/components/MetricCard";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { BootstrapResponse, ClassSummary } from "@/types/api";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function DashboardScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getBootstrap());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeClasses = data?.classes.filter((item) => item.activeSession) ?? [];

  return (
    <ScreenShell
      title={`Hi, ${user?.name.split(" ")[0] ?? "there"}`}
      eyebrow={user?.institute?.name ?? "ClassCard Pro"}
      right={
        <Pressable onPress={signOut} style={styles.iconButton}>
          <Ionicons name="log-out-outline" color={colors.white} size={20} />
        </Pressable>
      }
    >
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="Today classes" value={String(data.classes.length)} icon="calendar" tone={colors.gold} />
            <MetricCard label="Active sessions" value={String(activeClasses.length)} icon="radio" tone={colors.emerald} />
            <MetricCard label="Pending dues" value={String(data.pendingPayments.count)} icon="receipt" tone={colors.amber} />
            <MetricCard label="Balance due" value={money(data.pendingPayments.amount)} icon="wallet" tone={colors.violet} />
          </View>

          <PremiumCard>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.cardTitle}>Attendance shortcuts</Text>
                <Text style={styles.cardSub}>Start or continue a class session.</Text>
              </View>
              <PremiumButton title="Classes" icon="albums" onPress={() => navigation.navigate("ClassSelection")} style={{ width: 116 }} />
            </View>
            {(data.classes.slice(0, 3) as ClassSummary[]).map((classGroup) => (
              <Pressable key={classGroup.id} onPress={() => navigation.navigate("ClassSelection")} style={styles.classRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{classGroup.name}</Text>
                  <Text style={styles.rowMeta}>{classGroup.schedule}</Text>
                </View>
                {classGroup.activeSession ? <StatusPill label="Active" value="active" /> : <StatusPill label="Ready" value="default" />}
              </Pressable>
            ))}
          </PremiumCard>

          <PremiumCard>
            <Text style={styles.cardTitle}>Recent scans</Text>
            {data.recentScans.length === 0 ? (
              <Text style={styles.cardSub}>No scans yet today. Fresh slate.</Text>
            ) : (
              data.recentScans.map((scan) => (
                <View key={scan.id} style={styles.scanRow}>
                  <View style={styles.scanIcon}>
                    <Ionicons name={scan.source === "NFC" ? "card" : "qr-code"} color={colors.blue} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{scan.student?.name ?? scan.message}</Text>
                    <Text style={styles.rowMeta}>{scan.classGroup?.name ?? "Attendance"} · {new Date(scan.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  {scan.status ? <StatusPill value={scan.status.toLowerCase()} /> : null}
                </View>
              ))
            )}
          </PremiumCard>
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10
  },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  cardSub: { color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14
  },
  scanIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  rowMeta: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", marginTop: 3 },
  error: { color: colors.red, fontWeight: "800" }
});
