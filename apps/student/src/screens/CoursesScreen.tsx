import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { getCourses } from "@/api/student";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/theme/colors";

export function CoursesScreen() {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { getCourses().then((res) => setItems(res.courses as any[])).catch(() => setItems([])); }, []);
  return (
    <ScreenShell title="My Courses" eyebrow="Classes and materials">
      {!items ? <ActivityIndicator color={colors.gold} /> : items.length ? items.map((item) => (
        <PremiumCard key={item.id}>
          <Text style={styles.title}>{item.course.name}</Text>
          <Text style={styles.meta}>{item.className} · {item.teacherName}</Text>
          <Text style={styles.copy}>{item.timetable}</Text>
          <Text style={styles.copy}>{item.course.description ?? "Course details and materials appear here."}</Text>
        </PremiumCard>
      )) : <EmptyState title="No courses" message="Assigned classes will appear here." icon="book" />}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 18, fontWeight: "900" }, meta: { marginTop: 5, color: colors.teal, fontWeight: "800" }, copy: { marginTop: 8, color: colors.muted, lineHeight: 20 } });
