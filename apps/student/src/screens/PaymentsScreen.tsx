import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { getPayments } from "@/api/student";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";

export function PaymentsScreen() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { getPayments().then(setData).catch(() => undefined); }, []);
  return <ScreenShell title="Payments" eyebrow="Fees and receipts">{!data ? <ActivityIndicator color={colors.gold} /> : <><PremiumCard><Text style={styles.big}>${data.pendingAmount}</Text><Text style={styles.meta}>Pending payment balance</Text></PremiumCard>{data.payments.map((payment: any) => <PremiumCard key={payment.id}><Text style={styles.title}>{payment.invoiceNo}</Text><Text style={styles.meta}>{payment.className} · {payment.month}</Text><Text style={styles.meta}>Paid ${payment.paidAmount} · Balance ${payment.balance}</Text><StatusPill label={payment.status} tone={payment.status === "PAID" ? "success" : payment.status === "OVERDUE" ? "danger" : "warning"} /></PremiumCard>)}</>}</ScreenShell>;
}

const styles = StyleSheet.create({ big: { color: colors.text, fontSize: 42, fontWeight: "900" }, title: { color: colors.text, fontWeight: "900" }, meta: { color: colors.muted, marginTop: 7 } });
