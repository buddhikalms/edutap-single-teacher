import { useEffect } from "react";
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { AttendanceScreen } from "@/screens/AttendanceScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { NotificationDetailScreen } from "@/screens/NotificationDetailScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { PaymentsScreen } from "@/screens/PaymentsScreen";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function AppNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate("Notifications");
      }
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.ink } }}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink }, animation: "slide_from_right" }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
