import { StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  const style = tone === "success" ? styles.success : tone === "warning" ? styles.warning : tone === "danger" ? styles.danger : styles.neutral;
  return <Text style={[styles.pill, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: "900", overflow: "hidden" },
  success: { backgroundColor: "#dcfce7", color: colors.green },
  warning: { backgroundColor: "#fef3c7", color: "#b45309" },
  danger: { backgroundColor: "#ffe4e6", color: colors.rose },
  neutral: { backgroundColor: "#eef2f7", color: colors.muted }
});
