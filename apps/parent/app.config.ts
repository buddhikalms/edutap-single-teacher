const config = {
  name: "EduTap Parent",
  slug: "edutap-parent",
  scheme: "edutapparent",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#08131f"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.edutap.parent"
  },
  android: {
    package: "com.edutap.parent",
    adaptiveIcon: {
      backgroundColor: "#08131f"
    }
  },
  plugins: ["expo-dev-client", "expo-secure-store", "expo-notifications"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
  }
};

export default config;
