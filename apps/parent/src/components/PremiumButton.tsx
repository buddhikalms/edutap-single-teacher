import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

export function PremiumButton({
  title,
  icon,
  onPress,
  variant = "solid",
  style
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "solid" | "ghost";
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.button, variant === "ghost" && styles.ghost, style]}>
      {icon ? <Ionicons name={icon} color={variant === "ghost" ? colors.text : colors.ink} size={18} /> : null}
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    borderWidth: 1
  },
  label: { color: colors.ink, fontWeight: "900" },
  ghostLabel: { color: colors.text }
});
