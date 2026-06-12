import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { IntegrationProvider, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const secret = process.env.PROVIDER_CREDENTIAL_KEY ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error("Set PROVIDER_CREDENTIAL_KEY or NEXTAUTH_SECRET before saving provider credentials.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Credential payload is invalid.");

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export async function upsertProviderCredential(input: {
  instituteId: string;
  provider: IntegrationProvider;
  name: string;
  value: string;
  client?: PrismaClient;
}) {
  const db = input.client ?? prisma;
  const trimmed = input.value.trim();
  if (!trimmed) return null;

  return db.providerCredential.upsert({
    where: {
      instituteId_provider_name: {
        instituteId: input.instituteId,
        provider: input.provider,
        name: input.name
      }
    },
    create: {
      instituteId: input.instituteId,
      provider: input.provider,
      name: input.name,
      encryptedValue: encryptSecret(trimmed),
      lastFour: trimmed.slice(-4)
    },
    update: {
      encryptedValue: encryptSecret(trimmed),
      lastFour: trimmed.slice(-4)
    }
  });
}

export async function getProviderCredential(instituteId: string, provider: IntegrationProvider, name: string) {
  const credential = await prisma.providerCredential.findUnique({
    where: {
      instituteId_provider_name: {
        instituteId,
        provider,
        name
      }
    }
  });

  return credential ? decryptSecret(credential.encryptedValue) : null;
}

export async function getProviderCredentials(instituteId: string, provider: IntegrationProvider, names: string[]) {
  const rows = await prisma.providerCredential.findMany({
    where: { instituteId, provider, name: { in: names } }
  });

  return Object.fromEntries(rows.map((row) => [row.name, decryptSecret(row.encryptedValue)]));
}

export async function upsertEncryptedIntegrationTokens(input: {
  instituteId: string;
  provider: IntegrationProvider;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string | null;
  accountEmail?: string | null;
  externalAccountId?: string | null;
  metadata?: Prisma.InputJsonObject;
}) {
  const accessToken = input.accessToken ? encryptSecret(input.accessToken) : undefined;
  const refreshToken = input.refreshToken ? encryptSecret(input.refreshToken) : undefined;

  return prisma.integrationAccount.upsert({
    where: {
      instituteId_provider: {
        instituteId: input.instituteId,
        provider: input.provider
      }
    },
    create: {
      instituteId: input.instituteId,
      provider: input.provider,
      connected: true,
      accessToken: accessToken ?? null,
      refreshToken: refreshToken ?? null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? null,
      accountEmail: input.accountEmail ?? null,
      externalAccountId: input.externalAccountId ?? null,
      metadata: input.metadata ?? {}
    },
    update: {
      connected: true,
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
      tokenExpiresAt: input.tokenExpiresAt ?? undefined,
      scopes: input.scopes ?? undefined,
      accountEmail: input.accountEmail ?? undefined,
      externalAccountId: input.externalAccountId ?? undefined,
      metadata: input.metadata ?? undefined,
      lastError: null
    }
  });
}

export function decryptIntegrationToken(token: string | null) {
  return token ? decryptSecret(token) : null;
}
