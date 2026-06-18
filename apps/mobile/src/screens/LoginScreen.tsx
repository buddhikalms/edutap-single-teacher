import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { PremiumButton } from "@/components/PremiumButton";
import { defaultApiUrl } from "@/config/env";
import { colors } from "@/theme/colors";

export function LoginScreen() {
  const { signIn, apiUrl: savedApiUrl } = useAuth();
  const [email, setEmail] = useState("admin@edutap.test");
  const [password, setPassword] = useState("EduTap@2026");
  const [apiUrl, setApiUrl] = useState(savedApiUrl?.includes("localhost") ? defaultApiUrl : savedApiUrl || defaultApiUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await signIn({ email: email.trim(), password, apiUrl: apiUrl.trim() });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#07111f", "#112947", "#c99b3b"]} locations={[0, 0.72, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="card" color={colors.gold} size={28} />
            </View>
            <Text style={styles.brandTitle}>EduTap</Text>
            <Text style={styles.brandSub}>Premium attendance terminal for teachers and staff.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Staff Sign In</Text>
            <Text style={styles.label}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#8b98aa" />
            <Text style={styles.label}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#8b98aa" />
            <Text style={styles.label}>Backend URL</Text>
            <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" style={styles.input} placeholder="http://192.168.1.10:3000" placeholderTextColor="#8b98aa" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PremiumButton title="Enter Mobile Terminal" icon="log-in" onPress={handleLogin} loading={loading} />
            {loading ? <ActivityIndicator color={colors.gold} /> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 22,
    gap: 22
  },
  brand: {
    paddingTop: 18,
    gap: 12
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  brandTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "900"
  },
  brandSub: {
    color: "#c9d4e3",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300
  },
  form: {
    backgroundColor: colors.panel,
    borderRadius: 28,
    padding: 20,
    gap: 10
  },
  formTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.ink,
    fontWeight: "700",
    backgroundColor: colors.panelSoft
  },
  error: {
    color: colors.red,
    fontWeight: "700",
    lineHeight: 20
  }
});
