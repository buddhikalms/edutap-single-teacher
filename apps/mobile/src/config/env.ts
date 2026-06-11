import Constants from "expo-constants";

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined);
const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];

export const defaultApiUrl =
  configuredApiUrl && !configuredApiUrl.includes("localhost")
    ? configuredApiUrl
    : metroHost
      ? `http://${metroHost}:3000`
      : configuredApiUrl ?? "http://10.0.2.2:3000";
