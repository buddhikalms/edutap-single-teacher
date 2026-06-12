import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { getAttendance } from "@/api/student";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";

export function AttendanceScreen() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { getAttendance().then(setData).catch(() => undefined); }, []);
  return <ScreenShell title="Attendance" eyebrow="History">{!data ? <ActivityIndicator color={colors.gold} /> : <><PremiumCard><Text style={styles.big}>{data.percentage}%</Text><Text style={styles.meta}>Monthly and class-wise attendance overview</Text></PremiumCard>{data.history.map((item: any) => <PremiumCard key={item.id}><Text style={styles.title}>{item.className}</Text><Text style={styles.meta}>{new Date(item.sessionDate).toLocaleDateString()}</Text><StatusPill label={item.status} tone={item.status === "PRESENT" ? "success" : item.status === "LATE" ? "warning" : "danger"} /></PremiumCard>)}</>}</ScreenShell>;
}

const styles = StyleSheet.create({ big: { color: colors.text, fontSize: 44, fontWeight: "900" }, title: { color: colors.text, fontWeight: "900", fontSize: 16 }, meta: { color: colors.muted, marginVertical: 8 } });
