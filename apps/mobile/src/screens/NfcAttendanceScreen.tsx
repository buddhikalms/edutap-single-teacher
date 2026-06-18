import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import NfcManager from "react-native-nfc-manager";
import { markNfcAttendance } from "@/api/mobile";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ResultCard } from "@/components/ResultCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { ensureNfcReady, readNfcUid } from "@/lib/nfc";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";
import type { ScanResult } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "NfcAttendance">;

export function NfcAttendanceScreen({ navigation, route }: Props) {
  const { classGroupId, className, sessionId } = route.params;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<ScanResult[]>([]);
  const [lastReadUid, setLastReadUid] = useState("");
  const autoStarted = useRef(false);
  const lastUid = useRef<{ uid: string; at: number } | null>(null);
  const mounted = useRef(true);
  const scanning = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanNfcRef = useRef<() => Promise<void>>(async () => undefined);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    mounted.current = true;
    ensureNfcReady()
      .then(() => setSupported(true))
      .catch(() => setSupported(false));

    return () => {
      mounted.current = false;
      if (restartTimer.current) {
        clearTimeout(restartTimer.current);
      }
      NfcManager.cancelTechnologyRequest().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [listening, pulse]);

  const handleUid = useCallback(async (uid: string) => {
    const now = Date.now();
    if (mounted.current) {
      setLastReadUid(uid);
    }
    if (lastUid.current?.uid === uid && now - lastUid.current.at < 3000) {
      if (mounted.current) {
        setResult({ ok: false, message: "Duplicate tap ignored for a moment.", student: undefined, credential: { nfcUid: uid, normalizedNfcUid: uid } });
      }
      return;
    }

    lastUid.current = { uid, at: now };
    const response = await markNfcAttendance(classGroupId, uid);
    if (mounted.current) {
      setResult(response);
      setRecent((items) => [response, ...items].slice(0, 8));
    }
  }, [classGroupId]);

  const scheduleNextScan = useCallback(() => {
    if (!mounted.current || supported !== true) {
      return;
    }

    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
    }

    restartTimer.current = setTimeout(() => {
      void scanNfcRef.current();
    }, 650);
  }, [supported]);

  const scanNfc = useCallback(async () => {
    if (!supported || scanning.current) return;
    scanning.current = true;
    if (mounted.current) {
      setListening(true);
    }
    try {
      const card = await readNfcUid("Hold the student NFC card near this device.");
      await handleUid(card.uid);
    } catch (scanError) {
      if (mounted.current) {
        setResult({ ok: false, message: scanError instanceof Error ? scanError.message : "NFC scan was cancelled." });
      }
    } finally {
      if (mounted.current) {
        setListening(false);
      }
      scanning.current = false;
      await NfcManager.cancelTechnologyRequest().catch(() => undefined);
      scheduleNextScan();
    }
  }, [handleUid, scheduleNextScan, supported]);

  useEffect(() => {
    scanNfcRef.current = scanNfc;
  }, [scanNfc]);

  useEffect(() => {
    if (supported !== true || autoStarted.current) {
      return;
    }

    autoStarted.current = true;
    const timer = setTimeout(() => {
      void scanNfc();
    }, 350);

    return () => clearTimeout(timer);
  }, [scanNfc, supported]);

  return (
    <ScreenShell
      title="NFC Attendance"
      eyebrow={className}
      right={
        <Pressable onPress={() => navigation.navigate("ManualAttendance", { classGroupId, className, sessionId })} style={styles.iconButton}>
          <Ionicons name="people" color={colors.white} size={20} />
        </Pressable>
      }
    >
      <Animated.View style={[styles.tapCard, { transform: [{ scale: pulse }] }]}>
        <View style={styles.ring}>
          <Ionicons name="card" color={colors.gold} size={52} />
        </View>
        <Text style={styles.tapTitle}>{listening ? "Listening for card" : "Tap student card"}</Text>
        <Text style={styles.tapSub}>Hold the NFC card near the device. The UID is sent to EduTap instantly.</Text>
        {supported === null ? <ActivityIndicator color={colors.gold} /> : null}
        {supported === false ? <Text style={styles.error}>NFC is not available on this device or build.</Text> : null}
        {lastReadUid ? <Text style={styles.uid}>Last UID {lastReadUid}</Text> : null}
        <PremiumButton title={listening ? "Waiting..." : "Start NFC Listening"} icon="radio" onPress={scanNfc} loading={listening} disabled={!supported} />
      </Animated.View>

      <ResultCard result={result} />

      <PremiumCard>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>Recent scanned students</Text>
          <PremiumButton title="QR" icon="qr-code" variant="ghost" onPress={() => navigation.navigate("QrAttendance", { classGroupId, className, sessionId })} style={{ width: 82 }} />
        </View>
        {recent.length === 0 ? (
          <Text style={styles.meta}>No scans in this terminal session yet.</Text>
        ) : (
          recent.map((item, index) => (
            <View key={`${item.student?.id ?? item.message}-${index}`} style={styles.scanRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.student}>{item.student?.name ?? "Unknown card"}</Text>
                <Text style={styles.meta}>{item.credential?.normalizedNfcUid ?? (item.markedAt ? new Date(item.markedAt).toLocaleTimeString() : item.message)}</Text>
              </View>
              <StatusPill label={item.payment?.label ?? item.status ?? "Failed"} value={item.ok ? item.payment?.status ?? "present" : "overdue"} />
            </View>
          ))
        )}
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
  tapCard: {
    backgroundColor: "#0d1c31",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  ring: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(201,155,59,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,155,59,0.35)"
  },
  tapTitle: { color: colors.white, fontSize: 24, fontWeight: "900" },
  tapSub: { color: "#b9c6d8", fontSize: 14, lineHeight: 21, textAlign: "center" },
  error: { color: "#fecaca", fontWeight: "800", textAlign: "center" },
  uid: { color: colors.gold, fontWeight: "900", fontSize: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", flex: 1 },
  scanRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  student: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  meta: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 }
});
