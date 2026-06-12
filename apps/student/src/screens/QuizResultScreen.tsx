import { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { getQuizResult } from "@/api/student";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "QuizResult">;

export function QuizResultScreen({ route }: Props) {
  const [attempt, setAttempt] = useState<any | null>(null);
  useEffect(() => { getQuizResult(route.params.attemptId).then((res) => setAttempt(res.attempt)).catch(() => undefined); }, [route.params.attemptId]);
  return <ScreenShell title="Quiz Result" eyebrow={attempt?.quiz?.title}>{!attempt ? <ActivityIndicator color={colors.gold} /> : <><PremiumCard><Text style={styles.score}>{attempt.score}/{attempt.quiz.totalMarks}</Text><StatusPill label={attempt.passed ? "Passed" : "Review pending / not passed"} tone={attempt.passed ? "success" : "warning"} /></PremiumCard>{attempt.answers?.map((answer: any) => <PremiumCard key={answer.id}><Text style={styles.title}>{answer.question}</Text><Text style={styles.meta}>Marks {answer.marksAwarded}</Text>{answer.feedback ? <Text style={styles.meta}>{answer.feedback}</Text> : null}</PremiumCard>)}</>}</ScreenShell>;
}

const styles = StyleSheet.create({ score: { color: colors.text, fontSize: 42, fontWeight: "900", marginBottom: 10 }, title: { color: colors.text, fontWeight: "900" }, meta: { color: colors.muted, marginTop: 8 } });
