import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function decodeKey() {
  const raw = process.env.FACE_EMBEDDING_ENCRYPTION_KEY || process.env.BIOMETRIC_ENCRYPTION_KEY;
  if (!raw) throw new Error("FACE_EMBEDDING_ENCRYPTION_KEY or BIOMETRIC_ENCRYPTION_KEY is required when face attendance is enabled.");

  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.byteLength !== 32) throw new Error("FACE_EMBEDDING_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
}

export function encryptEmbedding(embedding: number[]) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, decodeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(embedding), "utf8"), cipher.final()]);
  return {
    encryptedEmbedding: encrypted,
    embeddingIv: iv,
    embeddingAuthTag: cipher.getAuthTag(),
    encryptionKeyVersion: process.env.FACE_ENCRYPTION_KEY_VERSION || "v1"
  };
}

export function decryptEmbedding(input: { encryptedEmbedding: Buffer; embeddingIv: Buffer; embeddingAuthTag: Buffer }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, decodeKey(), input.embeddingIv);
  decipher.setAuthTag(input.embeddingAuthTag);
  const plain = Buffer.concat([decipher.update(input.encryptedEmbedding), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plain);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
    throw new Error("Encrypted face embedding is malformed.");
  }
  return parsed as number[];
}

export function hashSafe(value?: string | null) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}
