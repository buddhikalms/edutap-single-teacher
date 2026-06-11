import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

const tone = {
  paid: [colors.emeraldSoft, colors.emerald],
  clear: [colors.emeraldSoft, colors.emerald],
  present: [colors.emeraldSoft, colors.emerald],
  pending: [colors.amberSoft, colors.amber],
  partial: [colors.violetSoft, colors.violet],
  overdue: [colors.redSoft, colors.red],
  absent: [colors.redSoft, colors.red],
  late: [colors.amberSoft, colors.amber],
  excused: [colors.blueSoft, colors.blue],
  active: [colors.emeraldSoft, colors.emerald],
  default: [colors.panelSoft, colors.inkMuted]
} as const;

export function StatusPill({ label, value }: { label?: string; value?: string | null }) {
  const key = (value ?? label ?? "default").toLowerCase() as keyof typeof tone;
  const [backgroundColor, color] = tone[key] ?? tone.default;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={[styles.text, { color }]}>{label ?? value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  }
});
