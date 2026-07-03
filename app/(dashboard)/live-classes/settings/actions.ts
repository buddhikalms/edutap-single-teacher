"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { refreshZoomAccessToken, syncZoomRecordingForLiveClass, testZoomOAuthConnection } from "@/lib/live-meeting-providers";
import { prisma } from "@/lib/prisma";
import { upsertProviderCredential } from "@/lib/provider-credentials";
import { getTenantContext } from "@/lib/session";

function assertIntegrationAdmin(role: string) {
  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(role)) {
    throw new Error("Only admins can manage live class provider settings.");
  }
}

export async function saveZoomSettings(formData: FormData) {
  const { userId, role } = await getTenantContext();
  assertZoomTeacher(role);

  await prisma.zoomMeetingSettings.upsert({
    where: { userId },
    create: {
      userId,
      defaultDurationMinutes: Number(formData.get("defaultDurationMinutes") ?? 60),
      defaultWaitingRoom: formData.get("defaultWaitingRoom") === "on",
      defaultRecording: String(formData.get("defaultRecording") ?? "none"),
      defaultJoinBeforeHost: formData.get("defaultJoinBeforeHost") === "on",
      defaultMuteParticipants: formData.get("defaultMuteParticipants") === "on",
      defaultPasscodeGeneration: formData.get("defaultPasscodeGeneration") === "on",
      defaultHostVideo: formData.get("defaultHostVideo") === "on",
      defaultParticipantVideo: formData.get("defaultParticipantVideo") === "on"
    },
    update: {
      defaultDurationMinutes: Number(formData.get("defaultDurationMinutes") ?? 60),
      defaultWaitingRoom: formData.get("defaultWaitingRoom") === "on",
      defaultRecording: String(formData.get("defaultRecording") ?? "none"),
      defaultJoinBeforeHost: formData.get("defaultJoinBeforeHost") === "on",
      defaultMuteParticipants: formData.get("defaultMuteParticipants") === "on",
      defaultPasscodeGeneration: formData.get("defaultPasscodeGeneration") === "on",
      defaultHostVideo: formData.get("defaultHostVideo") === "on",
      defaultParticipantVideo: formData.get("defaultParticipantVideo") === "on"
    }
  });

  revalidateLiveClassSettings();
  redirect("/dashboard/settings/live-classes?updated=zoom-defaults");
}

export async function testZoomConnectionAction() {
  const { userId, role } = await getTenantContext();
  assertZoomTeacher(role);
  let target = "/dashboard/settings/live-classes?tested=zoom";

  try {
    await testZoomOAuthConnection(userId);
  } catch (error) {
    console.error(error);
    target = "/dashboard/settings/live-classes?tested=zoom-failed";
  }

  revalidateLiveClassSettings();
  redirect(target);
}

export async function refreshZoomTokenAction() {
  const { userId, role } = await getTenantContext();
  assertZoomTeacher(role);
  await refreshZoomAccessToken(userId);
  revalidateLiveClassSettings();
  redirect("/dashboard/settings/live-classes?updated=zoom-token");
}

export async function disconnectZoomAction() {
  const { userId, role } = await getTenantContext();
  assertZoomTeacher(role);
  await prisma.zoomConnection.deleteMany({ where: { userId } });
  revalidateLiveClassSettings();
  redirect("/dashboard/settings/live-classes?updated=zoom-disconnected");
}

export async function syncZoomRecordingAction(liveClassId: string) {
  const { userId, role } = await getTenantContext();
  assertZoomTeacher(role);
  await syncZoomRecordingForLiveClass({ userId, liveClassId });
  revalidatePath(`/live-classes/${liveClassId}`);
  redirect(`/live-classes/${liveClassId}?synced=zoom-recording`);
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

  revalidateLiveClassSettings();
  redirect("/dashboard/settings/live-classes?updated=google");
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

  revalidateLiveClassSettings();
  redirect("/dashboard/settings/live-classes?updated=google-disconnected");
}

function assertZoomTeacher(role: string) {
  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER"].includes(role)) {
    throw new Error("Only teachers and admins can manage Zoom.");
  }
}

function revalidateLiveClassSettings() {
  revalidatePath("/live-classes/settings");
  revalidatePath("/dashboard/settings/live-classes");
}
