import { useEffect, useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getQuiz, saveAnswer, startQuiz, submitQuiz } from "@/api/student";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "QuizTake">;

export function QuizTakeScreen({ navigation, route }: Props) {
  const [quiz, setQuiz] = useState<any | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);

  useEffect(() => { getQuiz(route.params.quizId).then(async (res) => { setQuiz(res.quiz); setSeconds(res.quiz.timeLimitMins * 60); const attempt = await startQuiz(route.params.quizId); setAttemptId(attempt.attemptId); }).catch(() => undefined); }, [route.params.quizId]);
  useEffect(() => { if (!seconds) return; const id = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(id); }, [seconds]);
  const question = quiz?.questions[index];
  const timer = useMemo(() => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  async function choose(value: string, option = false) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
    await saveAnswer(attemptId, question.id, option ? { selectedOptionId: value } : { answerText: value });
  }
  async function finish() { const result = await submitQuiz(attemptId); navigation.replace("QuizResult", { attemptId }); }

  return <ScreenShell title="Quiz" eyebrow={quiz?.title ?? "Loading"}>{!quiz || !question ? <ActivityIndicator color={colors.gold} /> : <><PremiumCard><View style={styles.row}><Text style={styles.counter}>Question {index + 1}/{quiz.questions.length}</Text><Text style={styles.timer}>{timer}</Text></View><Text style={styles.title}>{question.prompt}</Text>{question.options?.length ? question.options.map((option: any) => <Pressable key={option.id} onPress={() => choose(option.id, true)} style={[styles.option, answers[question.id] === option.id && styles.selected]}><Text style={styles.optionText}>{option.label}. {option.text}</Text></Pressable>) : <TextInput multiline style={styles.textarea} value={answers[question.id] ?? ""} onChangeText={(text) => choose(text)} placeholder="Type your answer" />}</PremiumCard><View style={styles.row}>{index > 0 ? <PremiumButton title="Back" variant="ghost" onPress={() => setIndex(index - 1)} /> : <View />}{index < quiz.questions.length - 1 ? <PremiumButton title="Next" onPress={() => setIndex(index + 1)} /> : <PremiumButton title="Submit" icon="checkmark" onPress={finish} />}</View></>}</ScreenShell>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, counter: { color: colors.muted, fontWeight: "900" }, timer: { color: colors.rose, fontWeight: "900" }, title: { color: colors.text, fontSize: 19, fontWeight: "900", marginVertical: 14 }, option: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginTop: 10 }, selected: { borderColor: colors.teal, backgroundColor: "#e6f4f1" }, optionText: { color: colors.text, fontWeight: "800" }, textarea: { minHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, textAlignVertical: "top" } });
