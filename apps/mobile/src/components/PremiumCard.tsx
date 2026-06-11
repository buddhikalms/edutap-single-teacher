import type React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

export function PremiumCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    padding: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8
  }
});
