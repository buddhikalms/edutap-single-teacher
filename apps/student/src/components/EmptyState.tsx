import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function EmptyState({ title, message, icon = "sparkles" }: { title: string; message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} color={colors.gold} size={32} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  title: { marginTop: 10, color: colors.text, fontWeight: "900", fontSize: 16 },
  message: { marginTop: 6, color: colors.muted, textAlign: "center", lineHeight: 20 }
});
