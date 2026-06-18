import { StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

const tones = {
  neutral: { bg: "rgba(148,163,184,0.16)", fg: colors.muted },
  success: { bg: "rgba(52,211,153,0.16)", fg: colors.green },
  warning: { bg: "rgba(245,158,11,0.16)", fg: colors.amber },
  danger: { bg: "rgba(251,113,133,0.16)", fg: colors.red }
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: keyof typeof tones }) {
  const palette = tones[tone];
  return <Text style={[styles.pill, { backgroundColor: palette.bg, color: palette.fg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  }
});
