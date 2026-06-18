import { useState } from "react";
import Constants from "expo-constants";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { loginParent } from "@/api/parent";
import { useAuth } from "@/auth/AuthContext";
import { PremiumButton } from "@/components/PremiumButton";
import { ScreenShell } from "@/components/ScreenShell";
import { colors } from "@/theme/colors";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [apiUrl, setApiUrl] = useState(String(Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await loginParent(apiUrl, email, password);
      await signIn({ token: response.token, apiUrl, parent: response.parent, students: response.students });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell title="Parent app" eyebrow="EduTap">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.form}>
        <View>
          <Text style={styles.label}>API URL</Text>
          <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.gold} /> : <PremiumButton title="Sign in" icon="log-in" onPress={submit} />}
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  label: { color: colors.muted, fontWeight: "800", marginBottom: 8 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    color: colors.text,
    fontWeight: "700"
  },
  error: { color: colors.red, fontWeight: "800" }
});
