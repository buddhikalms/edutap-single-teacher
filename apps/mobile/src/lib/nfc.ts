import { Platform } from "react-native";
import NfcManager, { Ndef, NdefStatus, NfcTech } from "react-native-nfc-manager";

export type NfcWriteMode = "UID_ONLY" | "NDEF_WRITTEN" | "NDEF_UNSUPPORTED";

export type NfcCardRead = {
  uid: string;
  techTypes?: string[];
};

type StudentCardPayload = {
  studentId: string;
  admissionNo: string;
  name: string;
};

const androidUidTechs = [NfcTech.NfcA, NfcTech.NfcB, NfcTech.NfcV, NfcTech.Ndef];

export async function ensureNfcReady() {
  const supported = await NfcManager.isSupported();

  if (!supported) {
    throw new Error("NFC is not available on this device or build.");
  }

  await NfcManager.start();

  if (Platform.OS === "android") {
    const enabled = await NfcManager.isEnabled();
    if (!enabled) {
      throw new Error("NFC is disabled. Enable NFC in Android settings and try again.");
    }
  }

  return true;
}

export async function readNfcUid(alertMessage = "Hold the student NFC card near this device.") {
  await ensureNfcReady();

  try {
    const techs = Platform.OS === "android" ? androidUidTechs : [NfcTech.Ndef];
    await NfcManager.requestTechnology(techs, { alertMessage });
    const tag = await NfcManager.getTag();
    const uid = tag?.id?.trim();

    if (!uid) {
      throw new Error("NFC card was read, but no UID was found.");
    }

    return { uid, techTypes: tag?.techTypes } satisfies NfcCardRead;
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}

export async function writeEduTapStudentTag(student: StudentCardPayload) {
  await ensureNfcReady();

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: `Hold the NFC card for ${student.name}.` });
    const tag = await NfcManager.getTag();
    const uid = tag?.id?.trim();

    if (!uid) {
      throw new Error("NFC card was read, but no UID was found.");
    }

    const status = await NfcManager.ndefHandler.getNdefStatus();

    if (status.status !== NdefStatus.ReadWrite) {
      return { uid, writeMode: "NDEF_UNSUPPORTED" as const };
    }

    const payload = JSON.stringify({
      app: "EduTap",
      type: "student-card",
      studentId: student.studentId,
      admissionNo: student.admissionNo,
      name: student.name,
      writtenAt: new Date().toISOString()
    });

    const bytes = Ndef.encodeMessage([
      Ndef.textRecord(payload),
      Ndef.uriRecord(`edutap://students/${student.studentId}`)
    ]);

    await NfcManager.ndefHandler.writeNdefMessage(bytes, { reconnectAfterWrite: true });
    return { uid, writeMode: "NDEF_WRITTEN" as const };
  } catch (error) {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);

    const fallback = await readNfcUid(`Hold the NFC card for ${student.name}.`);
    return { uid: fallback.uid, writeMode: "UID_ONLY" as const };
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}
