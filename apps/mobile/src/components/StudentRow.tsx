import type React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { StatusPill } from "@/components/StatusPill";
import type { RosterStudent } from "@/types/api";

export function StudentRow({ student, onPress, right }: { student: RosterStudent; onPress: () => void; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{student.name.slice(0, 1)}</Text>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.meta}>{student.admissionNo}</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <StatusPill label={student.payment.label} value={student.payment.status} />
          {student.todayAttendance ? <StatusPill value={student.todayAttendance.status.toLowerCase()} /> : null}
        </View>
      </View>
      {right ?? <Ionicons name="chevron-forward" color={colors.inkMuted} size={18} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.gold,
    fontWeight: "900",
    fontSize: 18
  },
  name: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: 15
  },
  meta: {
    color: colors.inkMuted,
    fontWeight: "700",
    fontSize: 12
  }
});
