import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/auth/AuthContext";
import { AppNavigator } from "@/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
