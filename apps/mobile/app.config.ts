import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "EduTap",
  slug: "edutap-mobile",
  scheme: "edutap",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.edutap.mobile",
    infoPlist: {
      NSCameraUsageDescription: "EduTap uses the camera to scan student attendance QR codes.",
      NFCReaderUsageDescription: "EduTap uses NFC to read student attendance cards."
    }
  },
  android: {
    package: "com.edutap.mobile",
    adaptiveIcon: {
      backgroundColor: "#07111f"
    },
    permissions: ["CAMERA", "NFC"]
  },
  plugins: [
    "expo-dev-client",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission: "Allow EduTap to scan student QR attendance codes."
      }
    ]
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
  }
};

export default config;
