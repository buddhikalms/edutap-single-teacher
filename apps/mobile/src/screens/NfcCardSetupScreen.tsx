import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { assignStudentNfc, getClassRoster } from "@/api/mobile";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { writeEduTapStudentTag, type NfcWriteMode } from "@/lib/nfc";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { RosterStudent } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "NfcCardSetup">;

function writeModeLabel(writeMode: NfcWriteMode) {
  if (writeMode === "NDEF_WRITTEN") return "Card written and linked";
  if (writeMode === "NDEF_UNSUPPORTED") return "UID linked, card is read-only";
  return "UID linked";
}

export function NfcCardSetupScreen({ route }: Props) {
  const { classGroupId, className } = route.params;
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUid, setLastUid] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getClassRoster(classGroupId);
      setStudents(response.students);
      setSelectedStudent((current) => current ?? response.students[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [classGroupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function assignCard() {
    if (!selectedStudent) return;

    setWriting(true);
    setError("");
    setSuccess("");

    try {
      const card = await writeEduTapStudentTag({
        studentId: selectedStudent.id,
        admissionNo: selectedStudent.admissionNo,
        name: selectedStudent.name
      });
      const response = await assignStudentNfc(selectedStudent.id, card.uid, card.writeMode);
      setLastUid(response.student.nfcUid);
      setSuccess(`${writeModeLabel(card.writeMode)} for ${response.student.name}.`);
      setStudents((items) =>
        items.map((student) => (student.id === response.student.id ? { ...student, nfcUid: response.student.nfcUid } : student))
      );
      setSelectedStudent((current) =>
        current?.id === response.student.id ? { ...current, nfcUid: response.student.nfcUid } : current
      );
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Could not write or assign NFC card.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <ScreenShell title="NFC Card Setup" eyebrow={className}>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <PremiumCard>
        <View style={styles.heroRow}>
          <View style={styles.iconRing}>
            <Ionicons name="card" color={colors.gold} size={34} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Assign a physical card</Text>
            <Text style={styles.meta}>Select a student, hold a blank or existing NFC card near the device, and the UID will be saved for attendance.</Text>
          </View>
        </View>
        {selectedStudent ? (
          <View style={styles.selectedBox}>
            <Text style={styles.studentName}>{selectedStudent.name}</Text>
            <Text style={styles.meta}>{selectedStudent.admissionNo}</Text>
            <View style={styles.statusRow}>
              {selectedStudent.nfcUid ? <StatusPill label="NFC linked" value="active" /> : <StatusPill label="No NFC" value="pending" />}
              {lastUid ? <Text style={styles.uid}>Last UID {lastUid}</Text> : null}
            </View>
          </View>
        ) : null}
        <PremiumButton title={writing ? "Hold card..." : "Write / Link NFC Card"} icon="radio" onPress={assignCard} loading={writing} disabled={!selectedStudent} />
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.title}>Students</Text>
        {students.length === 0 ? <Text style={styles.meta}>No active students in this class.</Text> : null}
        {students.map((student) => {
          const active = selectedStudent?.id === student.id;
          return (
            <Pressable key={student.id} onPress={() => setSelectedStudent(student)} style={[styles.studentRow, active && styles.studentRowActive]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{student.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{student.name}</Text>
                <Text style={styles.meta}>{student.admissionNo}</Text>
                {student.nfcUid ? <Text style={styles.uid}>{student.nfcUid}</Text> : null}
              </View>
              {student.nfcUid ? <StatusPill label="Linked" value="active" /> : <StatusPill label="Setup" value="pending" />}
            </Pressable>
          );
        })}
      </PremiumCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  meta: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  selectedBox: {
    marginVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 },
  studentName: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border },
  studentRowActive: { backgroundColor: "#f8fafc", marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 16 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.gold, fontSize: 18, fontWeight: "900" },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  uid: { color: colors.gold, fontSize: 11, fontWeight: "900" },
  error: { color: colors.red, fontWeight: "800" },
  success: { color: colors.emerald, fontWeight: "900" }
});
