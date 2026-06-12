import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/LoginScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { CoursesScreen } from "@/screens/CoursesScreen";
import { LiveClassesScreen } from "@/screens/LiveClassesScreen";
import { HomeworkScreen } from "@/screens/HomeworkScreen";
import { HomeworkDetailScreen } from "@/screens/HomeworkDetailScreen";
import { QuizzesScreen } from "@/screens/QuizzesScreen";
import { QuizTakeScreen } from "@/screens/QuizTakeScreen";
import { QuizResultScreen } from "@/screens/QuizResultScreen";
import { AttendanceScreen } from "@/screens/AttendanceScreen";
import { PaymentsScreen } from "@/screens/PaymentsScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { session, loading } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.ink } }}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink }, animation: "slide_from_right" }}>
        {!session ? <Stack.Screen name="Login" component={LoginScreen} /> : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Courses" component={CoursesScreen} />
            <Stack.Screen name="LiveClasses" component={LiveClassesScreen} />
            <Stack.Screen name="Homework" component={HomeworkScreen} />
            <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
            <Stack.Screen name="Quizzes" component={QuizzesScreen} />
            <Stack.Screen name="QuizTake" component={QuizTakeScreen} />
            <Stack.Screen name="QuizResult" component={QuizResultScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
