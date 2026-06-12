import { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { getHomework } from "@/api/student";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { HomeworkItem } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Homework">;

export function HomeworkScreen({ navigation }: Props) {
  const [items, setItems] = useState<HomeworkItem[] | null>(null);
  useEffect(() => { getHomework().then((res) => setItems(res.homework)).catch(() => setItems([])); }, []);
  return (
    <ScreenShell title="Homework" eyebrow="Assignments">
      {!items ? <ActivityIndicator color={colors.gold} /> : items.length ? items.map((item) => (
        <Pressable key={item.id} onPress={() => navigation.navigate("HomeworkDetail", { homeworkId: item.id })}>
          <PremiumCard>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.className} · Due {new Date(item.deadline).toLocaleDateString()}</Text>
            <StatusPill label={item.status} tone={item.status === "REVIEWED" ? "success" : item.status === "LATE" || item.status === "MISSING" ? "warning" : "neutral"} />
          </PremiumCard>
        </Pressable>
      )) : <EmptyState title="No homework" message="New assignments from your teachers will appear here." icon="document-text" />}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 18, fontWeight: "900" }, meta: { color: colors.muted, marginVertical: 9, fontWeight: "700" } });
