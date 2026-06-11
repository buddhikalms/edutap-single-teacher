import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

type PremiumButtonProps = {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "dark" | "ghost" | "danger";
  style?: ViewStyle;
};

export function PremiumButton({ title, onPress, icon, loading, disabled, variant = "primary", style }: PremiumButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && { transform: [{ scale: 0.98 }] },
        style
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "ghost" ? colors.ink : colors.white} /> : null}
      {!loading && icon ? <Ionicons name={icon} size={18} color={variant === "ghost" ? colors.ink : colors.white} /> : null}
      <Text style={[styles.text, variant === "ghost" && { color: colors.ink }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18
  },
  primary: { backgroundColor: colors.blue },
  dark: { backgroundColor: colors.ink },
  danger: { backgroundColor: colors.red },
  ghost: { backgroundColor: colors.panelSoft, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.55 },
  text: { color: colors.white, fontWeight: "800", fontSize: 15 }
});
