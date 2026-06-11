import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function MetricCard({ label, value, icon, tone = colors.blue }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone?: string }) {
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} color={tone} size={20} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.panel,
    borderRadius: 22,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  value: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700"
  }
});
