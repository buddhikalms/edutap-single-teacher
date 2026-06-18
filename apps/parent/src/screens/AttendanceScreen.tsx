import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Attendance">;

function dateTime(value?: string) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export function AttendanceScreen({ route }: Props) {
  const notification = route.params?.notification;
  const isClassEnded = notification?.type === "CLASS_ENDED";
  const eventTime = isClassEnded ? notification?.data.endTime : notification?.data.attendanceTime;

  return (
    <ScreenShell title="Attendance" eyebrow={notification?.data.studentName ?? "Linked student"}>
      {!notification ? (
        <EmptyState title="Select a class notification" message="Open an arrival or class-over alert to see class, branch, teacher, and time details." icon="calendar-outline" />
      ) : (
        <PremiumCard>
          <Text style={styles.title}>{notification.data.studentName ?? notification.student?.name}</Text>
          <Detail label="Class" value={notification.data.className ?? "Class"} />
          <Detail label={isClassEnded ? "Class ended at" : "Marked at"} value={dateTime(eventTime)} />
          {notification.data.attendanceStatus ? <Detail label="Attendance status" value={notification.data.attendanceStatus} /> : null}
          <Detail label="Branch/location" value={notification.data.branchName ?? "Branch"} />
          <Detail label="Teacher" value={notification.data.teacherName ?? "Teacher"} />
          <Text style={styles.message}>{notification.body}</Text>
        </PremiumCard>
      )}
    </ScreenShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: 10 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: 14 },
  value: { color: colors.text, fontWeight: "900", marginTop: 4 },
  message: { color: colors.muted, lineHeight: 21, marginTop: 18 }
});
