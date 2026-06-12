import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getLiveClasses, joinLiveClass } from "@/api/student";
import { EmptyState } from "@/components/EmptyState";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { StatusPill } from "@/components/StatusPill";
import { colors } from "@/theme/colors";
import type { LiveClassItem, LiveClassesResponse } from "@/types/api";

function toneFor(item: LiveClassItem) {
  if (item.runtime === "live") return "success" as const;
  if (item.runtime === "upcoming") return "warning" as const;
  if (item.runtime === "completed") return "neutral" as const;
  return "danger" as const;
}

function normalizeMeetingUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function LiveClassesScreen() {
  const [data, setData] = useState<LiveClassesResponse | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function load() {
    const response = await getLiveClasses();
    setData(response);
  }

  useEffect(() => {
    load().catch(() => setData({ ok: true, liveNow: [], upcoming: [], completed: [], joinHistory: [] }));
  }, []);

  async function join(item: LiveClassItem) {
    if (item.locked) {
      Alert.alert("Locked class", "This is a paid live class. Please unlock access before joining.");
      return;
    }

    try {
      setJoiningId(item.id);
      const response = await joinLiveClass(item.id);
      await load();
      const meetingUrl = normalizeMeetingUrl(response.meetingUrl);

      if (!meetingUrl) {
        Alert.alert("Join link unavailable", "The teacher has not added a valid meeting link yet.");
        return;
      }

      await Linking.openURL(meetingUrl);
    } catch (error) {
      Alert.alert("Could not open class", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setJoiningId(null);
    }
  }

  if (!data) {
    return (
      <ScreenShell title="Live Classes" eyebrow="Online sessions">
        <ActivityIndicator color={colors.gold} />
      </ScreenShell>
    );
  }

  const hasAny = data.liveNow.length || data.upcoming.length || data.completed.length;

  return (
    <ScreenShell title="Live Classes" eyebrow="Online sessions">
      {!hasAny ? (
        <EmptyState title="No live classes" message="Upcoming online sessions from your teachers will appear here." icon="videocam" />
      ) : (
        <>
          <Section title="Live now" items={data.liveNow} joiningId={joiningId} onJoin={join} />
          <Section title="Upcoming" items={data.upcoming} joiningId={joiningId} onJoin={join} />
          <Section title="Completed" items={data.completed} joiningId={joiningId} onJoin={join} />
          <History items={data.joinHistory} />
        </>
      )}
    </ScreenShell>
  );
}

function Section({ title, items, joiningId, onJoin }: { title: string; items: LiveClassItem[]; joiningId: string | null; onJoin: (item: LiveClassItem) => void }) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <PremiumCard key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.pills}>
                <StatusPill label={item.runtime === "live" ? "live now" : item.runtime} tone={toneFor(item)} />
                <StatusPill label={item.locked ? "locked" : "free"} tone={item.locked ? "warning" : "success"} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.className} - {item.courseName}</Text>
            </View>
            <View style={styles.iconBox}>
              <Ionicons name={item.locked ? "lock-closed" : "videocam"} color={colors.white} size={20} />
            </View>
          </View>
          {item.description ? <Text style={styles.copy}>{item.description}</Text> : null}
          <View style={styles.infoGrid}>
            <Info label="Time" value={new Date(item.startTime).toLocaleString()} />
            <Info label="Teacher" value={item.teacherName} />
            <Info label="Provider" value={item.providerLabel} />
          </View>
          {item.locked ? (
            <View style={styles.locked}>
              <Text style={styles.lockedText}>Paid class locked. Unlock access to join.</Text>
            </View>
          ) : item.runtime === "completed" ? (
            <Recordings recordings={item.recordings} />
          ) : (
            <PremiumButton title={joiningId === item.id ? "Joining..." : item.joined ? "Join again" : "Join live class"} icon="log-in" onPress={() => onJoin(item)} />
          )}
          <Text style={styles.reminder}>Reminder notification placeholder</Text>
        </PremiumCard>
      ))}
    </View>
  );
}

function Recordings({ recordings }: { recordings: LiveClassItem["recordings"] }) {
  if (!recordings.length) {
    return <Text style={styles.hint}>Recording will appear here after the teacher publishes it.</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {recordings.map((recording) => (
        <Pressable
          key={recording.id}
          style={[styles.recording, recording.locked && styles.recordingLocked]}
          onPress={() => {
            if (!recording.recordingUrl) {
              Alert.alert("Recording locked", "This recording requires paid access.");
              return;
            }
            const recordingUrl = normalizeMeetingUrl(recording.recordingUrl);
            if (!recordingUrl) {
              Alert.alert("Recording unavailable", "The recording link is not available yet.");
              return;
            }
            Linking.openURL(recordingUrl).catch((error) => Alert.alert("Could not open recording", error instanceof Error ? error.message : "Please try again later."));
          }}
        >
          <Ionicons name={recording.locked ? "lock-closed" : "play-circle"} color={recording.locked ? "#b45309" : colors.teal} size={18} />
          <Text style={styles.recordingText} numberOfLines={1}>{recording.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function History({ items }: { items: LiveClassItem[] }) {
  if (!items.length) return null;

  return (
    <PremiumCard>
      <Text style={styles.sectionTitle}>Join history</Text>
      {items.slice(0, 6).map((item) => (
        <View key={item.id} style={styles.historyRow}>
          <Text style={styles.historyTitle}>{item.title}</Text>
          <Text style={styles.historyMeta}>{item.attendance?.joinedAt ? new Date(item.attendance.joinedAt).toLocaleString() : "Joined"}</Text>
        </View>
      ))}
    </PremiumCard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  card: { gap: 12 },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 10 },
  meta: { color: colors.muted, marginTop: 5, fontWeight: "700" },
  copy: { color: colors.muted, lineHeight: 20 },
  infoGrid: { gap: 8 },
  info: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, backgroundColor: colors.soft },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  infoValue: { color: colors.text, fontWeight: "900", marginTop: 4 },
  locked: { borderRadius: 14, backgroundColor: "#fef3c7", padding: 12 },
  lockedText: { color: "#b45309", fontWeight: "900" },
  reminder: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  hint: { color: colors.muted, fontWeight: "700" },
  recording: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  recordingLocked: { backgroundColor: "#fef3c7" },
  recordingText: { flex: 1, color: colors.text, fontWeight: "900" },
  historyRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 },
  historyTitle: { color: colors.text, fontWeight: "900" },
  historyMeta: { color: colors.muted, marginTop: 4, fontWeight: "700" }
});
