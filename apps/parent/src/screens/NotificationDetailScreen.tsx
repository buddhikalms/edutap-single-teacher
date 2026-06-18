import { useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { markNotificationRead } from "@/api/parent";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationDetail">;

function money(value: number | undefined) {
  return `Rs. ${Math.round(value ?? 0).toLocaleString("en-US")}`;
}

function dateTime(value?: string) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export function NotificationDetailScreen({ navigation, route }: Props) {
  const notification = route.params.notification;
  const payment = notification.data.payment;
  const dueItems = payment?.pendingItems ?? [];
  const isClassEnded = notification.type === "CLASS_ENDED";
  const eventTime = isClassEnded ? notification.data.endTime : notification.data.attendanceTime;

  useEffect(() => {
    if (notification.status === "UNREAD") {
      markNotificationRead(notification.id).catch(() => undefined);
    }
  }, [notification.id, notification.status]);

  return (
    <ScreenShell title={isClassEnded ? "Class ended" : "Arrival detail"} eyebrow="Notification">
      <PremiumCard>
        <View style={styles.badges}>
          <StatusPill label={notification.type.replaceAll("_", " ")} />
          <StatusPill label={payment?.paymentStatus ?? "PAID"} tone={(payment?.pendingTotal ?? 0) > 0 ? "warning" : "success"} />
          {notification.data.attendanceStatus ? <StatusPill label={notification.data.attendanceStatus} /> : null}
        </View>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message}>{notification.body}</Text>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.section}>Attendance</Text>
        <Detail label="Student" value={notification.data.studentName ?? notification.student?.name ?? "Student"} />
        <Detail label="Class" value={notification.data.className ?? "Class"} />
        <Detail label={isClassEnded ? "Class ended at" : "Attendance time"} value={dateTime(eventTime)} />
        {notification.data.attendanceStatus ? <Detail label="Attendance status" value={notification.data.attendanceStatus} /> : null}
        <Detail label="Branch/location" value={notification.data.branchName ?? "Branch"} />
        <Detail label="Teacher" value={notification.data.teacherName ?? "Teacher"} />
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.section}>Payments</Text>
        <Detail label="Pending total" value={money(payment?.pendingTotal)} />
        <Detail label="Overdue total" value={money(payment?.overdueTotal)} />
        <Detail label="Nearest due date" value={payment?.nearestDueDate ?? "No due date"} />
        {dueItems.map((item) => (
          <View key={item.id} style={styles.dueRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dueTitle}>{item.month ?? item.className ?? "Payment"}</Text>
              <Text style={styles.dueMeta}>Due {new Date(item.dueDate).toISOString().slice(0, 10)} - {item.status}</Text>
            </View>
            <Text style={styles.dueAmount}>{money(item.balance)}</Text>
          </View>
        ))}
        {dueItems.length === 0 ? <Text style={styles.message}>Payments are up to date.</Text> : null}
      </PremiumCard>

      <View style={styles.actions}>
        <PremiumButton title="View Payments" icon="card" onPress={() => navigation.navigate("Payments", { notification })} style={{ flex: 1 }} />
        <PremiumButton title="View Attendance" icon="calendar" variant="ghost" onPress={() => navigation.navigate("Attendance", { notification })} style={{ flex: 1 }} />
      </View>
    </ScreenShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  message: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  section: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 10 },
  detail: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  label: { color: colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  value: { color: colors.text, fontWeight: "900", marginTop: 4 },
  dueRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  dueTitle: { color: colors.text, fontWeight: "900" },
  dueMeta: { color: colors.muted, marginTop: 4 },
  dueAmount: { color: colors.gold, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 12 }
});
