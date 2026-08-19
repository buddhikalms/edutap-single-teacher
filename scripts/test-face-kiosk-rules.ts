import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AttendanceStatus } from "@prisma/client";
import { statusFromTiming } from "../lib/face-attendance";

async function testEncryptionRoundTrip() {
  process.env.BIOMETRIC_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  const { decryptEmbedding, encryptEmbedding } = await import("../lib/biometric-encryption");
  const embedding = Array.from({ length: 16 }, (_value, index) => index / 16);
  const encrypted = encryptEmbedding(embedding);
  const decrypted = decryptEmbedding({
    encryptedEmbedding: encrypted.encryptedEmbedding,
    embeddingIv: encrypted.embeddingIv,
    embeddingAuthTag: encrypted.embeddingAuthTag
  });

  assert.deepEqual(decrypted, embedding);
}

function decisionFromScores(input: { best: number; second?: number; match: number; ambiguityMargin: number }) {
  if (input.best < input.match) return "unknown";
  if (input.second !== undefined && input.best - input.second < input.ambiguityMargin) return "ambiguous";
  return "recognized";
}

async function main() {
  const startsAt = new Date("2026-08-19T09:00:00.000Z");
  assert.equal(statusFromTiming(new Date("2026-08-19T09:05:00.000Z"), new Date(startsAt.getTime() + 15 * 60_000)), AttendanceStatus.PRESENT);
  assert.equal(statusFromTiming(new Date("2026-08-19T09:20:00.000Z"), new Date(startsAt.getTime() + 15 * 60_000)), AttendanceStatus.LATE);

  assert.equal(decisionFromScores({ best: 0.91, second: 0.72, match: 0.82, ambiguityMargin: 0.1 }), "recognized");
  assert.equal(decisionFromScores({ best: 0.84, second: 0.8, match: 0.82, ambiguityMargin: 0.1 }), "ambiguous");
  assert.equal(decisionFromScores({ best: 0.7, second: 0.2, match: 0.82, ambiguityMargin: 0.1 }), "unknown");

  await testEncryptionRoundTrip();
  console.log("Face kiosk rules passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
