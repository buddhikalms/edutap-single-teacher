import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

export function PremiumButton({ title, icon, onPress, variant = "primary", style }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void; variant?: "primary" | "ghost"; style?: object }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, variant === "ghost" && styles.ghost, style]}>
      {icon ? <Ionicons name={icon} color={variant === "ghost" ? colors.teal : colors.white} size={18} /> : null}
      <Text style={[styles.text, variant === "ghost" && styles.ghostText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 16, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  ghost: { backgroundColor: "#e6f4f1" },
  text: { color: colors.white, fontWeight: "900" },
  ghostText: { color: colors.teal }
});
