import type React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type ScreenShellProps = {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
};

export function ScreenShell({ title, eyebrow, right, children, scroll = true }: ScreenShellProps) {
  const navigation = useNavigation();
  const route = useRoute();
  const canGoBack = navigation.canGoBack();
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" color={colors.white} size={24} />
          </Pressable>
        ) : null}
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
        <BottomDock currentRoute={route.name} onNavigate={(name) => navigation.navigate(name as never)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function routeGroup(routeName: string) {
  if (routeName.includes("Attendance")) return "ClassSelection";
  if (routeName === "StudentQuickView") return "ClassSelection";
  return routeName;
}

function BottomDock({ currentRoute, onNavigate }: { currentRoute: string; onNavigate: (name: keyof RootStackParamList) => void }) {
  const activeRoute = routeGroup(currentRoute);
  const items: Array<{ label: string; route: keyof RootStackParamList; icon: keyof typeof Ionicons.glyphMap }> = [
    { label: "Home", route: "Dashboard", icon: "home" },
    { label: "Classes", route: "ClassSelection", icon: "albums" }
  ];

  return (
    <View style={styles.dockWrap} pointerEvents="box-none">
      <View style={styles.dock}>
        {items.map((item) => {
          const active = activeRoute === item.route;
          return (
            <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onNavigate(item.route)} style={[styles.dockItem, active && styles.dockItemActive]}>
              <Ionicons name={active ? item.icon : (`${item.icon}-outline` as keyof typeof Ionicons.glyphMap)} color={active ? colors.white : "#8ea0b8"} size={22} />
              <Text style={[styles.dockLabel, active && styles.dockLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 124,
    gap: 16
  },
  header: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
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
  },
  dockWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 10
  },
  dock: {
    minHeight: 70,
    borderRadius: 24,
    padding: 8,
    backgroundColor: "rgba(7,17,31,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16
  },
  dockItem: {
    flex: 1,
    maxWidth: 150,
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  dockItemActive: {
    backgroundColor: colors.blue
  },
  dockLabel: {
    color: "#8ea0b8",
    fontSize: 12,
    fontWeight: "900"
  },
  dockLabelActive: {
    color: colors.white
  }
});
