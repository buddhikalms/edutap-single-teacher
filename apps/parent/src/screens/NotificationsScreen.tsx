import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getParentNotifications } from "@/api/parent";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { ParentNotification } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

function paymentTone(item: ParentNotification) {
  const status = item.data.payment?.paymentStatus;
  if (status === "OVERDUE") return "danger";
  if (status === "PENDING" || status === "PARTIAL") return "warning";
  return "success";
}

export function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<ParentNotification[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getParentNotifications()
        .then((response) => {
          if (active) setItems(response.notifications);
        })
        .catch(() => {
          if (active) setItems([]);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <ScreenShell title="Notifications" eyebrow="Parent app">
      {!items ? <ActivityIndicator color={colors.gold} /> : null}
      {items?.length === 0 ? <EmptyState title="No notifications" message="Arrival confirmations and payment-aware class alerts will appear here." /> : null}
      {items?.map((item) => (
        <Pressable key={item.id} onPress={() => navigation.navigate("NotificationDetail", { notification: item })}>
          <PremiumCard>
            <View style={styles.header}>
              <View style={styles.icon}>
                <Ionicons name={item.type === "CLASS_ENDED" ? "school" : "checkmark-circle"} color={colors.gold} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.top}>
                  <StatusPill label={item.status} tone={item.status === "UNREAD" ? "warning" : "neutral"} />
                  <StatusPill label={item.data.payment?.paymentStatus ?? "PAID"} tone={paymentTone(item)} />
                  {item.data.attendanceStatus ? <StatusPill label={item.data.attendanceStatus} /> : null}
                </View>
                <Text style={styles.title}>{item.title}</Text>
              </View>
            </View>
            <Text style={styles.message}>{item.body}</Text>
            {item.type === "CLASS_ENDED" ? (
              <View style={styles.metaGrid}>
                <Meta label="Student" value={item.data.studentName ?? item.student?.name ?? "Student"} />
                <Meta label="Class" value={item.data.className ?? "Class"} />
                <Meta label="Ended" value={item.data.endTime ? new Date(item.data.endTime).toLocaleTimeString() : "Not recorded"} />
                <Meta label="Pending" value={`Rs. ${Math.round(item.data.payment?.pendingTotal ?? 0).toLocaleString("en-US")}`} />
              </View>
            ) : null}
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
          </PremiumCard>
        </Pressable>
      ))}
    </ScreenShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,201,93,0.14)" },
  top: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  title: { color: colors.text, fontWeight: "900", fontSize: 17 },
  message: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  meta: { minWidth: "47%", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", padding: 10 },
  metaLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  metaValue: { color: colors.text, fontWeight: "900", marginTop: 4 },
  date: { color: colors.muted, fontSize: 12, marginTop: 12, fontWeight: "700" }
});
