import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { loginStudent } from "@/api/student";
import { useAuth } from "@/auth/AuthContext";
import { PremiumButton } from "@/components/PremiumButton";
import { colors } from "@/theme/colors";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [identifier, setIdentifier] = useState("CC-1001");
  const [password, setPassword] = useState("ClassCard@2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await loginStudent(apiUrl, identifier, password);
      await signIn({ token: response.token, apiUrl, student: response.student });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#07111f", "#10213a", "#f5f7fb"]} locations={[0, 0.5, 0.5]} style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>ClassCard Student</Text>
        <Text style={styles.copy}>Homework, quizzes, attendance, payments, and notices in one student workspace.</Text>
      </View>
      <View style={styles.card}>
        <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="Backend URL" autoCapitalize="none" />
        <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} placeholder="Email, mobile, or student ID" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.teal} /> : <PremiumButton title="Sign in" icon="log-in" onPress={submit} />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 22 },
  hero: { marginBottom: 28 },
  brand: { color: colors.white, fontSize: 34, fontWeight: "900" },
  copy: { color: "#b9c6d8", marginTop: 10, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 12 },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, fontWeight: "700" },
  error: { color: colors.rose, fontWeight: "800" }
});
