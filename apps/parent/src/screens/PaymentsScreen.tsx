import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Payments">;

function money(value: number | undefined) {
  return `Rs. ${Math.round(value ?? 0).toLocaleString("en-US")}`;
}

export function PaymentsScreen({ route }: Props) {
  const notification = route.params?.notification;
  const payment = notification?.data.payment;
  const items = payment?.pendingItems ?? [];

  return (
    <ScreenShell title="Payments" eyebrow={notification?.data.studentName ?? "Linked student"}>
      <PremiumCard>
        <Text style={styles.total}>{money(payment?.pendingTotal)}</Text>
        <Text style={styles.label}>Pending total</Text>
        <View style={styles.badges}>
          <StatusPill label={payment?.paymentStatus ?? "PAID"} tone={(payment?.pendingTotal ?? 0) > 0 ? "warning" : "success"} />
          <StatusPill label={`Overdue ${money(payment?.overdueTotal)}`} tone={(payment?.overdueTotal ?? 0) > 0 ? "danger" : "success"} />
        </View>
      </PremiumCard>
      {items.length === 0 ? <EmptyState title="Payments are up to date" message="No pending payment items were attached to this notification." icon="checkmark-circle" /> : null}
      {items.map((item) => (
        <PremiumCard key={item.id}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.month ?? item.className ?? "Payment"}</Text>
              <Text style={styles.itemMeta}>Due {new Date(item.dueDate).toISOString().slice(0, 10)}</Text>
            </View>
            <Text style={styles.amount}>{money(item.balance)}</Text>
          </View>
        </PremiumCard>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  total: { color: colors.text, fontSize: 32, fontWeight: "900" },
  label: { color: colors.muted, fontWeight: "800", marginTop: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  itemMeta: { color: colors.muted, marginTop: 5 },
  amount: { color: colors.gold, fontWeight: "900", fontSize: 16 }
});
