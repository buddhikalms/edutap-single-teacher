import type React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

type ScreenShellProps = {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
};

export function ScreenShell({ title, eyebrow, right, children, scroll = true }: ScreenShellProps) {
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );

  return (
    <LinearGradient colors={["#07111f", "#10213a", "#f5f7fb"]} locations={[0, 0.42, 0.42]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16
  },
  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  eyebrow: {
    color: "#a9b8ca",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800"
  }
});
