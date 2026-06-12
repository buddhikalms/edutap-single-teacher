import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getDashboard } from "@/api/student";
import { useAuth } from "@/auth/AuthContext";
import { PremiumCard } from "@/components/PremiumCard";
import { PremiumButton } from "@/components/PremiumButton";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { DashboardResponse } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => { getDashboard().then(setData).catch(() => undefined); }, []);

  if (!data) return <ScreenShell title="Dashboard"><ActivityIndicator color={colors.gold} /></ScreenShell>;

  return (
    <ScreenShell title={`Hi, ${data.student.name.split(" ")[0]}`} eyebrow="Student dashboard" right={<Pressable onPress={signOut} style={styles.icon}><Ionicons name="log-out" color={colors.white} size={20} /></Pressable>}>
      <View style={styles.grid}>
        <Metric label="Attendance" value={`${data.attendancePercentage}%`} />
        <Metric label="Pending fees" value={`$${data.pendingPayment}`} />
      </View>
      <View style={styles.actions}>
        {[
          ["Courses", "book", "Courses"],
          ["Live", "videocam", "LiveClasses"],
          ["Homework", "document-text", "Homework"],
          ["Quizzes", "trophy", "Quizzes"],
          ["Attendance", "calendar", "Attendance"],
          ["Payments", "card", "Payments"],
          ["Notices", "notifications", "Notifications"],
          ["Profile", "person", "Profile"]
        ].map(([label, icon, route]) => (
          <PremiumButton key={route} title={label} icon={icon as keyof typeof Ionicons.glyphMap} variant="ghost" onPress={() => navigation.navigate(route as never)} style={{ width: "48%" }} />
        ))}
      </View>
      <PremiumCard><Text style={styles.title}>Pending homework</Text>{data.pendingHomework.slice(0, 3).map((item) => <Pressable key={item.id} onPress={() => navigation.navigate("HomeworkDetail", { homeworkId: item.id })} style={styles.row}><Text style={styles.rowTitle}>{item.title}</Text><StatusPill label={item.status} tone="warning" /></Pressable>)}</PremiumCard>
      <PremiumCard><Text style={styles.title}>Upcoming quizzes</Text>{data.upcomingQuizzes.slice(0, 3).map((item) => <Pressable key={item.id} onPress={() => navigation.navigate("QuizTake", { quizId: item.id })} style={styles.row}><Text style={styles.rowTitle}>{item.title}</Text><StatusPill label={item.attempted ? "attempted" : "ready"} tone={item.attempted ? "success" : "neutral"} /></Pressable>)}</PremiumCard>
    </ScreenShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <PremiumCard style={{ flex: 1 }}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></PremiumCard>;
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  grid: { flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowTitle: { color: colors.text, fontWeight: "800", flex: 1 },
  metricLabel: { color: colors.muted, fontWeight: "800" },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 6 }
});
