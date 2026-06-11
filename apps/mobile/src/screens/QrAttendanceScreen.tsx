import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { markQrAttendance } from "@/api/mobile";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ResultCard } from "@/components/ResultCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { ScanResult } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "QrAttendance">;

function tokenFromQr(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { token?: string; attendanceToken?: string };
    if (parsed.token || parsed.attendanceToken) return parsed.token ?? parsed.attendanceToken ?? raw;
  } catch {
    // Plain tokens and URLs are both supported below.
  }

  try {
    const url = new URL(raw);
    return url.searchParams.get("token") ?? url.searchParams.get("attendanceToken") ?? raw;
  } catch {
    return raw;
  }
}

export function QrAttendanceScreen({ navigation, route }: Props) {
  const { classGroupId, className, sessionId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<ScanResult[]>([]);

  async function onScan(data: string) {
    if (busy || !scanning) return;
    setBusy(true);
    setScanning(false);
    try {
      const response = await markQrAttendance(classGroupId, tokenFromQr(data));
      setResult(response);
      setRecent((items) => [response, ...items].slice(0, 6));
    } catch (scanError) {
      setResult({ ok: false, message: scanError instanceof Error ? scanError.message : "QR scan failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell
      title="QR Attendance"
      eyebrow={className}
      right={
        <Pressable onPress={() => navigation.navigate("NfcAttendance", { classGroupId, className, sessionId })} style={styles.iconButton}>
          <Ionicons name="card" color={colors.white} size={20} />
        </Pressable>
      }
    >
      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanning ? ({ data }) => onScan(data) : undefined}
          />
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera" color={colors.gold} size={38} />
            <Text style={styles.permissionText}>Camera access is required to scan secure student QR codes.</Text>
            <PremiumButton title="Allow Camera" icon="camera" onPress={requestPermission} />
          </View>
        )}
        <View style={styles.frame} />
      </View>

      <ResultCard result={result} />
      <PremiumButton title={scanning ? "Scanner Active" : "Scan Next QR"} icon="qr-code" onPress={() => setScanning(true)} disabled={busy} />

      <PremiumCard>
        <Text style={styles.title}>Recent QR results</Text>
        {recent.length === 0 ? <Text style={styles.meta}>Scan a student QR code to begin.</Text> : null}
        {recent.map((item, index) => (
          <View key={`${item.student?.id ?? item.message}-${index}`} style={styles.scanRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.student}>{item.student?.name ?? "Unknown QR"}</Text>
              <Text style={styles.meta}>{item.message}</Text>
            </View>
            <StatusPill label={item.payment?.label ?? item.status ?? "Failed"} value={item.ok ? item.payment?.status ?? "present" : "overdue"} />
          </View>
        ))}
      </PremiumCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraWrap: {
    height: 360,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#07111f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  frame: {
    position: "absolute",
    top: 74,
    left: 54,
    right: 54,
    bottom: 74,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.gold
  },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  permissionText: { color: colors.white, textAlign: "center", fontSize: 14, lineHeight: 21 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  scanRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  student: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  meta: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 }
});
