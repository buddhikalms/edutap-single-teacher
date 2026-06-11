import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/LoginScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ClassSelectionScreen } from "@/screens/ClassSelectionScreen";
import { NfcAttendanceScreen } from "@/screens/NfcAttendanceScreen";
import { QrAttendanceScreen } from "@/screens/QrAttendanceScreen";
import { ManualAttendanceScreen } from "@/screens/ManualAttendanceScreen";
import { StudentQuickViewScreen } from "@/screens/StudentQuickViewScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.ink } }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ink },
          animation: "slide_from_right"
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ClassSelection" component={ClassSelectionScreen} />
            <Stack.Screen name="NfcAttendance" component={NfcAttendanceScreen} />
            <Stack.Screen name="QrAttendance" component={QrAttendanceScreen} />
            <Stack.Screen name="ManualAttendance" component={ManualAttendanceScreen} />
            <Stack.Screen name="StudentQuickView" component={StudentQuickViewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
