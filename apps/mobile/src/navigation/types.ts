export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  ClassSelection: undefined;
  NfcAttendance: { classGroupId: string; className: string; sessionId?: string };
  QrAttendance: { classGroupId: string; className: string; sessionId?: string };
  ManualAttendance: { classGroupId: string; className: string; sessionId?: string };
  StudentQuickView: { studentId: string };
};
