"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { testZoomServerConnection } from "@/lib/live-meeting-providers";
import { prisma } from "@/lib/prisma";
import { upsertProviderCredential } from "@/lib/provider-credentials";
import { getTenantContext } from "@/lib/session";

function assertIntegrationAdmin(role: string) {
  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role)) {
    throw new Error("Only admins can manage live class provider settings.");
  }
}

export async function saveZoomSettings(formData: FormData) {
  const { instituteId, role } = await getTenantContext();
  assertIntegrationAdmin(role);

  const accountId = String(formData.get("accountId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const clientSecret = String(formData.get("clientSecret") ?? "");

  await upsertProviderCredential({ instituteId, provider: "ZOOM", name: "accountId", value: accountId });
  await upsertProviderCredential({ instituteId, provider: "ZOOM", name: "clientId", value: clientId });
  await upsertProviderCredential({ instituteId, provider: "ZOOM", name: "clientSecret", value: clientSecret });
  const configuredZoomCredentials = await prisma.providerCredential.count({
    where: { instituteId, provider: "ZOOM", name: { in: ["accountId", "clientId", "clientSecret"] } }
  });
  const zoomConnected = configuredZoomCredentials === 3;

  await prisma.integrationAccount.upsert({
    where: { instituteId_provider: { instituteId, provider: "ZOOM" } },
    create: {
      instituteId,
      provider: "ZOOM",
      connected: zoomConnected,
      metadata: { authType: "server_to_server_oauth" }
    },
    update: {
      connected: zoomConnected,
      metadata: { authType: "server_to_server_oauth" },
      lastError: null
    }
  });

  revalidatePath("/live-classes/settings");
  redirect("/live-classes/settings?updated=zoom");
}

export async function testZoomConnectionAction() {
  const { instituteId, role } = await getTenantContext();
  assertIntegrationAdmin(role);
  let target = "/live-classes/settings?tested=zoom";

  try {
    const result = await testZoomServerConnection(instituteId);

    await prisma.integrationAccount.upsert({
      where: { instituteId_provider: { instituteId, provider: "ZOOM" } },
      create: {
        instituteId,
        provider: "ZOOM",
        connected: true,
        accountEmail: result.accountEmail,
        externalAccountId: result.externalAccountId,
        metadata: { authType: "server_to_server_oauth", lastTestedAt: new Date().toISOString() }
      },
      update: {
        connected: true,
        accountEmail: result.accountEmail,
        externalAccountId: result.externalAccountId,
        metadata: { authType: "server_to_server_oauth", lastTestedAt: new Date().toISOString() },
        lastError: null
      }
    });

  } catch (error) {
    target = "/live-classes/settings?tested=zoom-failed";
    await prisma.integrationAccount.upsert({
      where: { instituteId_provider: { instituteId, provider: "ZOOM" } },
      create: {
        instituteId,
        provider: "ZOOM",
        connected: false,
        metadata: { authType: "server_to_server_oauth", lastTestedAt: new Date().toISOString() },
        lastError: error instanceof Error ? error.message : "Zoom connection test failed."
      },
      update: {
        connected: false,
        metadata: { authType: "server_to_server_oauth", lastTestedAt: new Date().toISOString() },
        lastError: error instanceof Error ? error.message : "Zoom connection test failed."
      }
    });

  }

  revalidatePath("/live-classes/settings");
  redirect(target);
}

export async function saveGoogleOAuthSettings(formData: FormData) {
  const { instituteId, role } = await getTenantContext();
  assertIntegrationAdmin(role);

  const clientId = String(formData.get("clientId") ?? "");
  const clientSecret = String(formData.get("clientSecret") ?? "");

  await upsertProviderCredential({ instituteId, provider: "GOOGLE", name: "clientId", value: clientId });
  await upsertProviderCredential({ instituteId, provider: "GOOGLE", name: "clientSecret", value: clientSecret });
  const configuredGoogleCredentials = await prisma.providerCredential.count({
    where: { instituteId, provider: "GOOGLE", name: { in: ["clientId", "clientSecret"] } }
  });

  await prisma.integrationAccount.upsert({
    where: { instituteId_provider: { instituteId, provider: "GOOGLE" } },
    create: {
      instituteId,
      provider: "GOOGLE",
      connected: false,
      metadata: { oauthClientConfigured: configuredGoogleCredentials === 2 }
    },
    update: {
      metadata: { oauthClientConfigured: configuredGoogleCredentials === 2 },
      lastError: null
    }
  });

  revalidatePath("/live-classes/settings");
  redirect("/live-classes/settings?updated=google");
}

export async function disconnectGoogleAction() {
  const { instituteId, role } = await getTenantContext();
  assertIntegrationAdmin(role);

  await prisma.integrationAccount.upsert({
    where: { instituteId_provider: { instituteId, provider: "GOOGLE" } },
    create: { instituteId, provider: "GOOGLE", connected: false },
    update: {
      connected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      accountEmail: null,
      externalAccountId: null
    }
  });

  revalidatePath("/live-classes/settings");
  redirect("/live-classes/settings?updated=google-disconnected");
}
