import { useCallback, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getBootstrap, startAttendanceSession } from "@/api/mobile";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { BootstrapResponse, ClassSummary } from "@/types/api";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ClassSelection">;

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function ClassSelectionScreen({ navigation }: Props) {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getBootstrap();
      setData(response);
      setSelectedBranchId((current) => current ?? response.branches[0]?.id ?? null);
      setSelectedClass((current) => current ?? response.classes[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredClasses = useMemo(
    () => data?.classes.filter((classGroup) => !selectedBranchId || classGroup.branchId === selectedBranchId) ?? [],
    [data?.classes, selectedBranchId]
  );

  async function startSession() {
    if (!selectedClass) return;
    setStarting(true);
    setError("");
    try {
      const response = await startAttendanceSession(selectedClass.id, todayInput());
      const params = { classGroupId: selectedClass.id, className: selectedClass.name, sessionId: response.session.id };
      navigation.navigate("NfcAttendance", params);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start session.");
    } finally {
      setStarting(false);
    }
  }

  const activeSessionId = selectedClass?.activeSession?.id;
  const screenParams = selectedClass ? { classGroupId: selectedClass.id, className: selectedClass.name, sessionId: activeSessionId } : undefined;

  return (
    <ScreenShell title="Class Terminal" eyebrow="Select branch and class">
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data ? (
        <>
          <PremiumCard>
            <Text style={styles.title}>Branch</Text>
            <View style={styles.chips}>
              {data.branches.map((branch) => (
                <Pressable key={branch.id} onPress={() => setSelectedBranchId(branch.id)} style={[styles.chip, selectedBranchId === branch.id && styles.chipActive]}>
                  <Text style={[styles.chipText, selectedBranchId === branch.id && styles.chipTextActive]}>{branch.name}</Text>
                </Pressable>
              ))}
            </View>
          </PremiumCard>

          <PremiumCard>
            <Text style={styles.title}>Classes</Text>
            {filteredClasses.length === 0 ? <Text style={styles.meta}>No classes available for this branch.</Text> : null}
            {filteredClasses.map((classGroup) => (
              <Pressable key={classGroup.id} onPress={() => setSelectedClass(classGroup)} style={[styles.classItem, selectedClass?.id === classGroup.id && styles.classItemActive]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.classTitle}>{classGroup.name}</Text>
                  <Text style={styles.meta}>{classGroup.courseName} · {classGroup.schedule}</Text>
                  <Text style={styles.meta}>{classGroup.enrolledCount} enrolled · {classGroup.teacherName}</Text>
                </View>
                {classGroup.activeSession ? <StatusPill label="Active" value="active" /> : <StatusPill label="Ready" value="default" />}
              </Pressable>
            ))}
          </PremiumCard>

          {selectedClass ? (
            <PremiumCard>
              <Text style={styles.title}>{selectedClass.name}</Text>
              <Text style={styles.meta}>{selectedClass.schedule}</Text>
              <View style={styles.actions}>
                <PremiumButton title={activeSessionId ? "Continue NFC" : "Start NFC"} icon="card" onPress={startSession} loading={starting} />
                <PremiumButton title="QR Scanner" icon="qr-code" variant="dark" onPress={() => screenParams && navigation.navigate("QrAttendance", screenParams)} disabled={!activeSessionId} />
                <PremiumButton title="Manual" icon="people" variant="ghost" onPress={() => screenParams && navigation.navigate("ManualAttendance", screenParams)} disabled={!activeSessionId} />
              </View>
              {!activeSessionId ? <Text style={styles.hint}>Start a session first to enable QR and manual marking.</Text> : null}
            </PremiumCard>
          ) : null}
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 10 },
  meta: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.panelSoft, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.inkMuted, fontWeight: "800" },
  chipTextActive: { color: colors.white },
  classItem: { flexDirection: "row", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  classItemActive: { backgroundColor: "#f8fafc", marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 16 },
  classTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  actions: { gap: 10, marginTop: 16 },
  hint: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", marginTop: 10 },
  error: { color: colors.red, fontWeight: "800" }
});
