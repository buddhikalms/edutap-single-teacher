const config = {
  name: "EduTap Student",
  slug: "edutap-student",
  scheme: "edutapstudent",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.edutap.student"
  },
  android: {
    package: "com.edutap.student",
    adaptiveIcon: {
      backgroundColor: "#07111f"
    }
  },
  plugins: ["expo-dev-client", "expo-secure-store", "expo-document-picker"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
  }
};

export default config;
