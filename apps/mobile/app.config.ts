import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ClassCard Pro",
  slug: "classcard-pro-mobile",
  scheme: "classcardpro",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.classcardpro.mobile",
    infoPlist: {
      NSCameraUsageDescription: "ClassCard Pro uses the camera to scan student attendance QR codes.",
      NFCReaderUsageDescription: "ClassCard Pro uses NFC to read student attendance cards."
    }
  },
  android: {
    package: "com.classcardpro.mobile",
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
        cameraPermission: "Allow ClassCard Pro to scan student QR attendance codes."
      }
    ]
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
  }
};

export default config;
