import { useEffect, useState } from "react";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getHomeworkDetail, submitHomework, uploadHomeworkAttachment } from "@/api/student";
import { PremiumButton } from "@/components/PremiumButton";
import { PremiumCard } from "@/components/PremiumCard";
import { ScreenShell } from "@/components/ScreenShell";
import { readSession } from "@/storage/session";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "HomeworkDetail">;

type DocumentPickerNativeModule = {
  getDocumentAsync(options: {
    base64?: boolean;
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
    type?: string | string[];
  }): Promise<
    | { canceled: true; assets?: null }
    | {
        canceled: false;
        assets: Array<{ uri: string; name?: string | null; mimeType?: string | null }>;
      }
  >;
};

type HomeworkDetail = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  marks: number;
  className: string;
  attachments?: Array<{ id: string; name?: string | null; url: string }>;
  submission?: {
    answerText?: string | null;
    attachmentUrl?: string | null;
    feedback?: string | null;
    marksAwarded?: number | null;
  };
};

export function HomeworkDetailScreen({ route }: Props) {
  const [item, setItem] = useState<HomeworkDetail | null>(null);
  const [answer, setAnswer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadHomework() {
    const response = await getHomeworkDetail(route.params.homeworkId);
    const homework = response.homework as HomeworkDetail;
    setItem(homework);
    setAnswer(homework.submission?.answerText ?? "");
    setAttachmentUrl(homework.submission?.attachmentUrl ?? "");
    setAttachmentName(homework.submission?.attachmentUrl ? "Current attachment" : "");
  }

  useEffect(() => {
    loadHomework().catch(() => undefined);
  }, [route.params.homeworkId]);

  async function chooseAttachment() {
    if (uploading) return;

    const DocumentPicker = requireOptionalNativeModule<DocumentPickerNativeModule>("ExpoDocumentPicker");
    if (!DocumentPicker?.getDocumentAsync) {
      Alert.alert("App update required", "Install the latest student app build to enable file uploads. The current installed app does not include the document picker module.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        base64: false,
        copyToCacheDirectory: true,
        multiple: false,
        type: ["image/*", "application/pdf"]
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      setUploading(true);
      setAttachmentName(file.name ?? "Selected attachment");
      const uploaded = await uploadHomeworkAttachment(route.params.homeworkId, file);
      setAttachmentUrl(uploaded.url);
      setAttachmentName(uploaded.name);
    } catch (error) {
      setAttachmentName("");
      setAttachmentUrl("");
      const message = error instanceof Error ? error.message : "Could not upload the selected file.";
      if (message.includes("ExpoDocumentPicker") || message.toLowerCase().includes("native module")) {
        Alert.alert("App update required", "Install the latest student app build to enable file uploads. The current installed app does not include the document picker module.");
        return;
      }
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (submitting || uploading) return;

    try {
      setSubmitting(true);
      await submitHomework(route.params.homeworkId, answer, attachmentUrl);
      await loadHomework();
      Alert.alert("Submitted", "Your homework was submitted.");
    } catch (error) {
      Alert.alert("Submit failed", error instanceof Error ? error.message : "Could not submit homework.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell title="Homework Detail" eyebrow={item?.className}>
      {!item ? (
        <ActivityIndicator color={colors.gold} />
      ) : (
        <>
          <PremiumCard>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.copy}>{item.description}</Text>
            <Text style={styles.meta}>
              Due {new Date(item.deadline).toLocaleString()} - {item.marks} marks
            </Text>
          </PremiumCard>

          {item.attachments?.length ? (
            <PremiumCard>
              <Text style={styles.title}>Teacher attachments</Text>
              {item.attachments.map((attachment) => (
                <AttachmentLink key={attachment.id} label={attachment.name || attachment.url} url={attachment.url} />
              ))}
            </PremiumCard>
          ) : null}

          <PremiumCard>
            <Text style={styles.title}>Submit answer</Text>
            <TextInput
              multiline
              style={styles.textarea}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Type your answer"
              placeholderTextColor={colors.muted}
            />
            <PremiumButton
              title={uploading ? "Uploading..." : attachmentUrl ? "Replace file" : "Choose file"}
              icon="attach"
              variant="ghost"
              onPress={chooseAttachment}
            />
            {attachmentUrl ? (
              <AttachmentLink label={attachmentName || "Selected attachment"} url={attachmentUrl} />
            ) : (
              <Text style={styles.hint}>Attach a PDF or image, up to 10 MB.</Text>
            )}
            <PremiumButton
              title={submitting ? "Submitting..." : "Submit homework"}
              icon="cloud-upload"
              onPress={submit}
              style={styles.submitButton}
            />
          </PremiumCard>

          {item.submission?.feedback ? (
            <PremiumCard>
              <Text style={styles.title}>Feedback</Text>
              <Text style={styles.copy}>{item.submission.feedback}</Text>
              <Text style={styles.meta}>Marks {item.submission.marksAwarded ?? "-"}</Text>
            </PremiumCard>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

function AttachmentLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable onPress={() => openAttachment(url)} style={styles.attachmentRow}>
      <View style={styles.dot} />
      <Text style={styles.attachmentText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

async function openAttachment(url: string) {
  const value = url.trim();

  if (!value) {
    Alert.alert("Attachment unavailable", "This attachment does not have a file URL.");
    return;
  }

  let target = value;

  if (value.startsWith("/")) {
    const session = await readSession();
    target = session?.apiUrl ? `${session.apiUrl.replace(/\/$/, "")}${value}` : value;
  }

  if (!/^https?:\/\//i.test(target)) {
    Alert.alert("Attachment unavailable", "This attachment is saved as a note or file name, not a downloadable URL.");
    return;
  }

  const canOpen = await Linking.canOpenURL(target);
  if (!canOpen) {
    Alert.alert("Attachment unavailable", "No app is available to open this attachment.");
    return;
  }

  await Linking.openURL(target);
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: "900" },
  copy: { color: colors.muted, marginTop: 8, lineHeight: 21 },
  meta: { color: colors.teal, marginTop: 10, fontWeight: "800" },
  textarea: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    textAlignVertical: "top",
    marginVertical: 12,
    color: colors.text
  },
  hint: { color: colors.muted, marginTop: 10, fontWeight: "700" },
  submitButton: { marginTop: 14 },
  attachmentRow: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  attachmentText: { color: colors.text, flex: 1, fontWeight: "800" }
});
