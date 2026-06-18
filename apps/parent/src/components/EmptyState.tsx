import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function EmptyState({ title, message, icon = "notifications-outline" }: { title: string; message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.root}>
      <Ionicons name={icon} color={colors.gold} size={34} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", paddingVertical: 50, paddingHorizontal: 22 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 14 },
  message: { color: colors.muted, textAlign: "center", lineHeight: 20, marginTop: 8 }
});
