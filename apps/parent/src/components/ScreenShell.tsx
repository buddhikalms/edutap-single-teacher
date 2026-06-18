import type React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function ScreenShell({ title, eyebrow, right, children }: { title: string; eyebrow?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.ink, "#0d1b2c", "#101724"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {right}
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { color: colors.gold, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  content: { paddingHorizontal: 20, paddingBottom: 34, gap: 14 }
});
