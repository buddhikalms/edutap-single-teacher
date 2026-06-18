import type React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

export function PremiumCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(16,29,45,0.92)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 6
  }
});
