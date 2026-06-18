import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { loginStudent, registerStudent } from "@/api/student";
import { useAuth } from "@/auth/AuthContext";
import { PremiumButton } from "@/components/PremiumButton";
import { colors } from "@/theme/colors";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [identifier, setIdentifier] = useState("CC-1001");
  const [password, setPassword] = useState("EduTap@2026");
  const [instituteSlug, setInstituteSlug] = useState("edutap-demo");
  const [branchCode, setBranchCode] = useState("MAIN");
  const [admissionNo, setAdmissionNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentOccupation, setParentOccupation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await loginStudent(apiUrl, identifier, password);
      await signIn({ token: response.token, apiUrl, student: response.student });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await registerStudent(apiUrl, {
        instituteSlug,
        branchCode: branchCode || undefined,
        admissionNo: admissionNo || undefined,
        firstName,
        lastName,
        email: studentEmail,
        phone: studentPhone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        password,
        parentName,
        parentEmail: parentEmail || undefined,
        parentPhone,
        parentOccupation: parentOccupation || undefined
      });
      setIdentifier(studentEmail);
      setMode("login");
      setSuccess(`Registered ${response.student.name}. Admission no: ${response.student.admissionNo}`);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#07111f", "#10213a", "#f5f7fb"]} locations={[0, 0.5, 0.5]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>EduTap Student</Text>
          <Text style={styles.copy}>Homework, quizzes, attendance, payments, and notices in one student workspace.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, mode === "login" && styles.tabActive]} onPress={() => setMode("login")}>
              <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Sign in</Text>
            </Pressable>
            <Pressable style={[styles.tab, mode === "register" && styles.tabActive]} onPress={() => setMode("register")}>
              <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>Register</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} placeholder="Backend URL" autoCapitalize="none" />

          {mode === "login" ? (
            <>
              <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} placeholder="Email, mobile, or student ID" autoCapitalize="none" />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
              {success ? <Text style={styles.success}>{success}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator color={colors.teal} /> : <PremiumButton title="Sign in" icon="log-in" onPress={submit} />}
            </>
          ) : (
            <>
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.rowInput]} value={instituteSlug} onChangeText={setInstituteSlug} placeholder="Workspace slug" autoCapitalize="none" />
                <TextInput style={[styles.input, styles.rowInput]} value={branchCode} onChangeText={setBranchCode} placeholder="Branch code" autoCapitalize="characters" />
              </View>
              <TextInput style={styles.input} value={admissionNo} onChangeText={setAdmissionNo} placeholder="Admission no. (optional)" autoCapitalize="characters" />
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.rowInput]} value={firstName} onChangeText={setFirstName} placeholder="First name" />
                <TextInput style={[styles.input, styles.rowInput]} value={lastName} onChangeText={setLastName} placeholder="Last name" />
              </View>
              <TextInput style={styles.input} value={studentEmail} onChangeText={setStudentEmail} placeholder="Student email" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={studentPhone} onChangeText={setStudentPhone} placeholder="Student phone" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="Date of birth YYYY-MM-DD" />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

              <Text style={styles.sectionTitle}>Parent / guardian details</Text>
              <TextInput style={styles.input} value={parentName} onChangeText={setParentName} placeholder="Guardian name" />
              <TextInput style={styles.input} value={parentPhone} onChangeText={setParentPhone} placeholder="Guardian phone" keyboardType="phone-pad" />
              <TextInput style={styles.input} value={parentEmail} onChangeText={setParentEmail} placeholder="Guardian email" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} value={parentOccupation} onChangeText={setParentOccupation} placeholder="Guardian occupation" />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {loading ? <ActivityIndicator color={colors.teal} /> : <PremiumButton title="Create account" icon="person-add" onPress={register} />}
            </>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 22 },
  hero: { marginBottom: 28 },
  brand: { color: colors.white, fontSize: 34, fontWeight: "900" },
  copy: { color: "#b9c6d8", marginTop: 10, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 12 },
  tabs: { flexDirection: "row", gap: 8, backgroundColor: colors.soft, borderRadius: 16, padding: 4 },
  tab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  tabActive: { backgroundColor: colors.ink },
  tabText: { color: colors.muted, fontWeight: "900" },
  tabTextActive: { color: colors.white },
  row: { flexDirection: "row", gap: 10 },
  rowInput: { flex: 1 },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontWeight: "900", marginTop: 6 },
  success: { color: colors.green, fontWeight: "800" },
  error: { color: colors.rose, fontWeight: "800" }
});
