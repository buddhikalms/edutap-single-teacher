import type { ParentNotification } from "@/types/api";

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Notifications: undefined;
  NotificationDetail: { notification: ParentNotification };
  Payments: { notification?: ParentNotification } | undefined;
  Attendance: { notification?: ParentNotification } | undefined;
};
