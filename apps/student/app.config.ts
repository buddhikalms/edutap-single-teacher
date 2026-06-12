const config = {
  name: "ClassCard Student",
  slug: "classcard-student",
  scheme: "classcardstudent",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.classcardpro.student"
  },
  android: {
    package: "com.classcardpro.student",
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
