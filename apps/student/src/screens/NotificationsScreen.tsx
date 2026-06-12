import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { getNotifications } from "@/api/student";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";

export function NotificationsScreen() {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { getNotifications().then((res) => setItems(res.notifications as any[])).catch(() => setItems([])); }, []);
  return <ScreenShell title="Notifications" eyebrow="Alerts">{!items ? <ActivityIndicator color={colors.gold} /> : items.length ? items.map((item) => <PremiumCard key={item.id}><Text style={styles.title}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><StatusPill label={item.type} /></PremiumCard>) : <EmptyState title="No notifications" message="Homework, quiz, payment, and attendance alerts will appear here." icon="notifications" />}</ScreenShell>;
}

const styles = StyleSheet.create({ title: { color: colors.text, fontWeight: "900", fontSize: 16 }, message: { color: colors.muted, lineHeight: 20, marginVertical: 8 } });
