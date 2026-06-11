import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getClassRoster, saveManualAttendance } from "@/api/mobile";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { StudentRow } from "@/components/StudentRow";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { ClassRosterResponse } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "ManualAttendance">;
type AttendanceValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const statuses: AttendanceValue[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export function ManualAttendanceScreen({ navigation, route }: Props) {
  const { classGroupId, className, sessionId: routeSessionId } = route.params;
  const [data, setData] = useState<ClassRosterResponse | null>(null);
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<string, AttendanceValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await getClassRoster(classGroupId);
      setData(response);
      const initial: Record<string, AttendanceValue> = {};
      response.students.forEach((student) => {
        if (student.todayAttendance?.status) {
          initial[student.id] = student.todayAttendance.status as AttendanceValue;
        }
      });
      setMarks(initial);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [classGroupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sessionId = data?.session?.id ?? routeSessionId;
  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return data?.students ?? [];
    return (data?.students ?? []).filter((student) => `${student.name} ${student.admissionNo}`.toLowerCase().includes(value));
  }, [data?.students, search]);

  function setAllPresent() {
    const next: Record<string, AttendanceValue> = {};
    data?.students.forEach((student) => {
      next[student.id] = "PRESENT";
    });
    setMarks(next);
  }

  async function save() {
    if (!sessionId) {
      setMessage("Start an active session before saving manual attendance.");
      return;
    }

    const records = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) {
      setMessage("Mark at least one student.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await saveManualAttendance(sessionId, records);
      setMessage(response.message);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell
      title="Manual Attendance"
      eyebrow={className}
      right={
        <Pressable onPress={() => navigation.navigate("NfcAttendance", { classGroupId, className, sessionId })} style={styles.iconButton}>
          <Ionicons name="card" color={colors.white} size={20} />
        </Pressable>
      }
    >
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {message ? <Text style={message.includes("saved") ? styles.success : styles.error}>{message}</Text> : null}

      <PremiumCard>
        <View style={styles.searchBox}>
          <Ionicons name="search" color={colors.inkMuted} size={18} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or admission no" placeholderTextColor="#8b98aa" style={styles.searchInput} />
        </View>
        <View style={styles.actions}>
          <PremiumButton title="Bulk Present" icon="checkmark-done" variant="ghost" onPress={setAllPresent} />
          <PremiumButton title="Save Marks" icon="save" onPress={save} loading={saving} />
        </View>
      </PremiumCard>

      <PremiumCard>
        <View style={styles.summary}>
          <Text style={styles.title}>{filteredStudents.length} students</Text>
          {sessionId ? <StatusPill label="Active session" value="active" /> : <StatusPill label="No session" value="overdue" />}
        </View>
        {filteredStudents.length === 0 ? <Text style={styles.meta}>No students match your search.</Text> : null}
        {filteredStudents.map((student) => (
          <View key={student.id} style={styles.studentBlock}>
            <StudentRow student={student} onPress={() => navigation.navigate("StudentQuickView", { studentId: student.id })} right={<Ionicons name="person-circle" color={colors.inkMuted} size={22} />} />
            <View style={styles.statusGrid}>
              {statuses.map((status) => (
                <Pressable key={status} onPress={() => setMarks((current) => ({ ...current, [student.id]: status }))} style={[styles.statusButton, marks[student.id] === status && styles.statusActive]}>
                  <Text style={[styles.statusText, marks[student.id] === status && styles.statusTextActive]}>{status.toLowerCase()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </PremiumCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  searchBox: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14
  },
  searchInput: { flex: 1, color: colors.ink, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  summary: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", flex: 1 },
  meta: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  studentBlock: { paddingBottom: 12 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8 },
  statusButton: { flexGrow: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: colors.panelSoft, borderWidth: 1, borderColor: colors.border },
  statusActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  statusText: { color: colors.inkMuted, fontWeight: "900", textTransform: "capitalize", fontSize: 12 },
  statusTextActive: { color: colors.white },
  error: { color: colors.red, fontWeight: "800" },
  success: { color: colors.emerald, fontWeight: "900" }
});
