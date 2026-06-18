declare module "expo-linear-gradient" {
  import type React from "react";
  import type { ViewProps } from "react-native";

  export const LinearGradient: React.ComponentType<ViewProps & { colors: string[] }>;
}

declare module "expo-secure-store" {
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function getItemAsync(key: string): Promise<string | null>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module "@react-navigation/native" {
  import type React from "react";

  type NavigationRef<ParamList extends Record<string, unknown>> = {
    isReady(): boolean;
    navigate<RouteName extends keyof ParamList>(name: RouteName, params?: ParamList[RouteName]): void;
  };

  export const DarkTheme: { colors: Record<string, string> };
  export function NavigationContainer(
    props: { children?: React.ReactNode; theme?: unknown; ref?: unknown }
  ): React.ReactElement;
  export function createNavigationContainerRef<ParamList extends Record<string, unknown>>(): NavigationRef<ParamList>;
  export function useFocusEffect(effect: () => void | (() => void)): void;
}

declare module "@react-navigation/native-stack" {
  import type React from "react";

  type StackNavigation<ParamList> = {
    navigate<RouteName extends keyof ParamList>(name: RouteName, params?: ParamList[RouteName]): void;
  };

  type StackFactory<ParamList> = {
    Navigator: React.ComponentType<{ children?: React.ReactNode; screenOptions?: unknown }>;
    Screen: React.ComponentType<{ name: keyof ParamList; component: unknown }>;
  };

  export function createNativeStackNavigator<ParamList>(): StackFactory<ParamList>;
  export type NativeStackScreenProps<ParamList, RouteName extends keyof ParamList> = {
    navigation: StackNavigation<ParamList>;
    route: {
      params: ParamList[RouteName];
    };
  };
}
