import { Platform } from "react-native";
import { apiRequest } from "@/api/client";
import type { ParentNotification, ParentSession } from "@/types/api";

type LoginResponse = {
  ok: true;
  token: string;
  parent: ParentSession["parent"];
  students: ParentSession["students"];
};

export function loginParent(apiUrl: string, email: string, password: string) {
  return apiRequest<LoginResponse>("/api/parent/auth/login", {
    method: "POST",
    apiUrl,
    token: null,
    body: { email, password }
  });
}

export function getParentNotifications() {
  return apiRequest<{ ok: true; notifications: ParentNotification[] }>("/api/parent/notifications");
}

export function markNotificationRead(id: string) {
  return apiRequest<{ ok: true; count: number }>("/api/parent/notifications/read", {
    method: "POST",
    body: { id }
  });
}

export function registerDeviceToken(expoPushToken: string) {
  return apiRequest<{ ok: true }>("/api/parent/device-token", {
    method: "POST",
    body: {
      expoPushToken,
      platform: Platform.OS,
      deviceName: `${Platform.OS} parent app`
    }
  });
}
