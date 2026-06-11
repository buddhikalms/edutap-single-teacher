import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import type { ScanResult } from "@/types/api";
import { StatusPill } from "@/components/StatusPill";

export function ResultCard({ result }: { result: ScanResult | null }) {
  if (!result) {
    return (
      <View style={[styles.card, { backgroundColor: colors.panelSoft }]}>
        <Ionicons name="scan" color={colors.inkMuted} size={24} />
        <Text style={styles.title}>Ready for the next scan</Text>
        <Text style={styles.body}>NFC and QR results appear here instantly with payment context.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: result.ok ? colors.emeraldSoft : colors.redSoft }]}>
      <Ionicons name={result.ok ? "checkmark-circle" : "alert-circle"} color={result.ok ? colors.emerald : colors.red} size={30} />
      <Text style={styles.title}>{result.student?.name ?? (result.ok ? "Attendance marked" : "Scan failed")}</Text>
      <Text style={styles.body}>{result.message}</Text>
      {result.credential?.normalizedNfcUid ? <Text style={styles.uid}>UID {result.credential.normalizedNfcUid}</Text> : null}
      <View style={styles.row}>
        {result.status ? <StatusPill value={result.status.toLowerCase()} /> : null}
        {result.payment ? <StatusPill label={result.payment.label} value={result.payment.status} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 8
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  body: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20
  },
  uid: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  }
});
