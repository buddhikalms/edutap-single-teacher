import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getParentNotifications } from "@/api/parent";
import { useAuth } from "@/auth/AuthContext";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { ParentNotification } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [items, setItems] = useState<ParentNotification[] | null>(null);

  useEffect(() => {
    getParentNotifications().then((response) => setItems(response.notifications)).catch(() => setItems([]));
  }, []);

  const unread = items?.filter((item) => item.status === "UNREAD").length ?? 0;

  return (
    <ScreenShell
      title={`Hi, ${session?.parent.name.split(" ")[0] ?? "Parent"}`}
      eyebrow="Parent dashboard"
      right={
        <Pressable onPress={signOut} style={styles.icon}>
          <Ionicons name="log-out" color={colors.white} size={20} />
        </Pressable>
      }
    >
      <View style={styles.grid}>
        <Metric label="Linked students" value={String(session?.students.length ?? 0)} />
        <Metric label="Unread alerts" value={String(unread)} />
      </View>
      <View style={styles.actions}>
        <PremiumButton title="Notifications" icon="notifications" variant="ghost" onPress={() => navigation.navigate("Notifications")} style={{ width: "48%" }} />
        <PremiumButton title="Payments" icon="card" variant="ghost" onPress={() => navigation.navigate("Payments")} style={{ width: "48%" }} />
        <PremiumButton title="Attendance" icon="calendar" variant="ghost" onPress={() => navigation.navigate("Attendance")} style={{ width: "48%" }} />
      </View>
      <PremiumCard>
        <Text style={styles.title}>Recent arrivals</Text>
        {!items ? <ActivityIndicator color={colors.gold} /> : null}
        {items?.slice(0, 4).map((item) => (
          <Pressable key={item.id} onPress={() => navigation.navigate("NotificationDetail", { notification: item })} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowText} numberOfLines={2}>{item.body}</Text>
            </View>
            <StatusPill label={item.status} tone={item.status === "UNREAD" ? "warning" : "neutral"} />
          </Pressable>
        ))}
      </PremiumCard>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  grid: { flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", gap: 10 },
  rowTitle: { color: colors.text, fontWeight: "900" },
  rowText: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  metricLabel: { color: colors.muted, fontWeight: "800" },
  metricValue: { color: colors.text, fontSize: 30, fontWeight: "900", marginTop: 6 }
});
