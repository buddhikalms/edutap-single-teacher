import { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { getQuizzes } from "@/api/student";
import { EmptyState } from "@/components/EmptyState";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { QuizItem } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Quizzes">;

export function QuizzesScreen({ navigation }: Props) {
  const [items, setItems] = useState<QuizItem[] | null>(null);
  useEffect(() => { getQuizzes().then((res) => setItems(res.quizzes)).catch(() => setItems([])); }, []);
  return <ScreenShell title="Quizzes" eyebrow="Assessments">{!items ? <ActivityIndicator color={colors.gold} /> : items.length ? items.map((item) => <Pressable key={item.id} onPress={() => item.latestAttempt?.status !== "IN_PROGRESS" && item.latestAttempt ? navigation.navigate("QuizResult", { attemptId: item.latestAttempt.id }) : navigation.navigate("QuizTake", { quizId: item.id })}><PremiumCard><Text style={styles.title}>{item.title}</Text><Text style={styles.meta}>{item.className} · {item.timeLimitMins} min · {item.totalMarks} marks</Text><StatusPill label={item.availability} tone={item.availability === "live" ? "success" : "neutral"} /></PremiumCard></Pressable>) : <EmptyState title="No quizzes" message="Upcoming quizzes will appear here." icon="trophy" />}</ScreenShell>;
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 18, fontWeight: "900" }, meta: { color: colors.muted, marginVertical: 9, fontWeight: "700" } });
